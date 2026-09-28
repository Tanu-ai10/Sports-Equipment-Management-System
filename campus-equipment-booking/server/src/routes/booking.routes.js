const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { computeEquipmentStatus } = require('../utils/fines');

const router = express.Router();
const MAX_ACTIVE = Number(process.env.MAX_ACTIVE_BOOKINGS_PER_STUDENT || 3);

async function notify(client, userId, message) {
  await client.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [userId, message]);
}

// GET /api/bookings/mine — student's own bookings
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*, e.Name AS equipmentname, e.Sport AS sport
       FROM Bookings b JOIN Equipment e ON e.EquipmentID = b.EquipmentID
       WHERE b.UserID = $1 ORDER BY b.CreatedAt DESC`,
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch your bookings.' });
  }
});

// GET /api/bookings?status=Pending&date=today  — Coordinator/Admin views
router.get('/', requireAuth, requireRole('Admin'), async (req, res) => {
  const { status, date, dueToday, overdue } = req.query;
  const clauses = [];
  const params = [];

  if (status) { params.push(status); clauses.push(`b.Status = $${params.length}`); }
  if (date === 'today') { clauses.push(`b.Date = CURRENT_DATE`); }
  if (dueToday === 'true') { clauses.push(`b.Status = 'Issued' AND b.Date = CURRENT_DATE`); }
  if (overdue === 'true') { clauses.push(`b.Status = 'Overdue'`); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  try {
    const result = await db.query(
      `SELECT b.*, u.Name AS studentname, e.Name AS equipmentname, e.Sport AS sport
       FROM Bookings b
       JOIN Users u ON u.UserID = b.UserID
       JOIN Equipment e ON e.EquipmentID = b.EquipmentID
       ${where}
       ORDER BY b.Date ASC, b.CreatedAt DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch bookings.' });
  }
});

// POST /api/bookings — Student creates a booking request
router.post('/', requireAuth, requireRole('Student'), async (req, res) => {
  const { equipmentId, date, timeSlot, quantity, purpose } = req.body;
  if (!equipmentId || !date || !timeSlot || !quantity || !purpose) {
    return res.status(400).json({ error: 'equipmentId, date, timeSlot, quantity and purpose are required.' });
  }
  const qty = parseInt(quantity, 10);
  if (qty < 1) return res.status(400).json({ error: 'quantity must be at least 1.' });

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock the equipment row to avoid race conditions on availability
    const eqRes = await client.query('SELECT * FROM Equipment WHERE EquipmentID = $1 FOR UPDATE', [equipmentId]);
    if (eqRes.rowCount === 0) throw { status: 404, message: 'Equipment not found.' };
    const eq = eqRes.rows[0];

    if (qty > eq.availablequantity) {
      await notify(client, req.user.userId, `${eq.name} is unavailable in the quantity you requested.`);
      await client.query('COMMIT');
      return res.status(409).json({ error: `Only ${eq.availablequantity} unit(s) of ${eq.name} available.` });
    }

    const activeRes = await client.query(
      `SELECT COUNT(*) FROM Bookings WHERE UserID = $1 AND Status IN ('Pending','Approved','Issued')`,
      [req.user.userId]
    );
    if (Number(activeRes.rows[0].count) >= MAX_ACTIVE) {
      throw { status: 409, message: `Booking limit reached: max ${MAX_ACTIVE} active bookings at a time.` };
    }

    const dupRes = await client.query(
      `SELECT 1 FROM Bookings WHERE UserID=$1 AND EquipmentID=$2 AND Date=$3 AND TimeSlot=$4
       AND Status IN ('Pending','Approved','Issued')`,
      [req.user.userId, equipmentId, date, timeSlot]
    );
    if (dupRes.rowCount > 0) {
      throw { status: 409, message: 'You already have a booking for this equipment in that slot.' };
    }

    const bookingRes = await client.query(
      `INSERT INTO Bookings (UserID, EquipmentID, Date, TimeSlot, Quantity, Purpose, Status)
       VALUES ($1,$2,$3,$4,$5,$6,'Pending') RETURNING *`,
      [req.user.userId, equipmentId, date, timeSlot, qty, purpose]
    );

    const newAvailable = eq.availablequantity - qty;
    const newStatus = computeEquipmentStatus({ quantity: eq.quantity, availableQuantity: newAvailable, condition: eq.condition });
    await client.query('UPDATE Equipment SET AvailableQuantity=$1, Status=$2 WHERE EquipmentID=$3', [newAvailable, newStatus, equipmentId]);

    await notify(client, req.user.userId, `Booking request ${bookingRes.rows[0].bookingid} for ${eq.name} submitted — awaiting coordinator approval.`);

    await client.query('COMMIT');
    res.status(201).json(bookingRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not create booking.' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/cancel — Student cancels a Pending/Approved booking
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bkRes = await client.query('SELECT * FROM Bookings WHERE BookingID=$1 FOR UPDATE', [req.params.id]);
    if (bkRes.rowCount === 0) throw { status: 404, message: 'Booking not found.' };
    const booking = bkRes.rows[0];

    if (booking.userid !== req.user.userId && req.user.role === 'Student') {
      throw { status: 403, message: 'You can only cancel your own bookings.' };
    }
    if (!['Pending', 'Approved'].includes(booking.status)) {
      throw { status: 409, message: `Cannot cancel a booking with status ${booking.status}.` };
    }

    const eqRes = await client.query('SELECT * FROM Equipment WHERE EquipmentID=$1 FOR UPDATE', [booking.equipmentid]);
    const eq = eqRes.rows[0];
    const newAvailable = eq.availablequantity + booking.quantity;
    const newStatus = computeEquipmentStatus({ quantity: eq.quantity, availableQuantity: newAvailable, condition: eq.condition });
    await client.query('UPDATE Equipment SET AvailableQuantity=$1, Status=$2 WHERE EquipmentID=$3', [newAvailable, newStatus, eq.equipmentid]);

    await client.query(`UPDATE Bookings SET Status='Cancelled' WHERE BookingID=$1`, [req.params.id]);
    await notify(client, booking.userid, `Booking ${booking.bookingid} was cancelled.`);

    await client.query('COMMIT');
    res.json({ message: 'Booking cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not cancel booking.' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/approve — Coordinator/Admin
router.patch('/:id/approve', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const bkRes = await db.query('SELECT * FROM Bookings WHERE BookingID=$1', [req.params.id]);
    if (bkRes.rowCount === 0) return res.status(404).json({ error: 'Booking not found.' });
    const booking = bkRes.rows[0];
    if (booking.status !== 'Pending') return res.status(409).json({ error: `Cannot approve a booking with status ${booking.status}.` });

    const result = await db.query(`UPDATE Bookings SET Status='Approved' WHERE BookingID=$1 RETURNING *`, [req.params.id]);
    const eqRes = await db.query('SELECT Name FROM Equipment WHERE EquipmentID=$1', [booking.equipmentid]);
    await db.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [
      booking.userid,
      `Great news — your booking ${booking.bookingid} for ${eqRes.rows[0]?.name} was approved.`,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not approve booking.' });
  }
});

// PATCH /api/bookings/:id/reject — Coordinator/Admin
router.patch('/:id/reject', requireAuth, requireRole('Admin'), async (req, res) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bkRes = await client.query('SELECT * FROM Bookings WHERE BookingID=$1 FOR UPDATE', [req.params.id]);
    if (bkRes.rowCount === 0) throw { status: 404, message: 'Booking not found.' };
    const booking = bkRes.rows[0];
    if (booking.status !== 'Pending') throw { status: 409, message: `Cannot reject a booking with status ${booking.status}.` };

    const eqRes = await client.query('SELECT * FROM Equipment WHERE EquipmentID=$1 FOR UPDATE', [booking.equipmentid]);
    const eq = eqRes.rows[0];
    const newAvailable = eq.availablequantity + booking.quantity;
    const newStatus = computeEquipmentStatus({ quantity: eq.quantity, availableQuantity: newAvailable, condition: eq.condition });
    await client.query('UPDATE Equipment SET AvailableQuantity=$1, Status=$2 WHERE EquipmentID=$3', [newAvailable, newStatus, eq.equipmentid]);

    await client.query(`UPDATE Bookings SET Status='Rejected' WHERE BookingID=$1`, [req.params.id]);
    await notify(client, booking.userid, `Your booking ${booking.bookingid} for ${eq.name} was rejected by the coordinator.`);

    await client.query('COMMIT');
    res.json({ message: 'Booking rejected.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not reject booking.' });
  } finally {
    client.release();
  }
});

// PATCH /api/bookings/:id/issue — Coordinator/Admin confirms physical hand-off
router.patch('/:id/issue', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const bkRes = await db.query('SELECT * FROM Bookings WHERE BookingID=$1', [req.params.id]);
    if (bkRes.rowCount === 0) return res.status(404).json({ error: 'Booking not found.' });
    const booking = bkRes.rows[0];
    if (booking.status !== 'Approved') return res.status(409).json({ error: `Cannot issue a booking with status ${booking.status}.` });

    const result = await db.query(`UPDATE Bookings SET Status='Issued', IssuedAt=now() WHERE BookingID=$1 RETURNING *`, [req.params.id]);
    await db.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [
      booking.userid,
      `Equipment for booking ${booking.bookingid} has been issued to you. Please return on time.`,
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not issue equipment.' });
  }
});

module.exports = router;
