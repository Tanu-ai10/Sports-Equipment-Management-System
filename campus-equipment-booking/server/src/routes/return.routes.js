const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { computeEquipmentStatus, FINE_DAMAGE, FINE_LOST } = require('../utils/fines');

const router = express.Router();

// POST /api/returns — Coordinator/Admin marks a booking's equipment as returned
// body: { bookingId, equipmentCondition: 'Good'|'Fair'|'Damaged'|'Lost' }
router.post('/', requireAuth, requireRole('Admin'), upload.single('image'), async (req, res) => {
  const { bookingId, equipmentCondition } = req.body;
  const damageDescription = typeof req.body.damageDescription === 'string' ? req.body.damageDescription.trim() : '';
  if (!bookingId || !equipmentCondition) {
    return res.status(400).json({ error: 'bookingId and equipmentCondition are required.' });
  }
  const validConditions = ['Good', 'Fair', 'Damaged', 'Lost'];
  if (!validConditions.includes(equipmentCondition)) {
    return res.status(400).json({ error: `equipmentCondition must be one of: ${validConditions.join(', ')}` });
  }
  if (equipmentCondition === 'Damaged' && !damageDescription) {
    return res.status(400).json({ error: 'A damage description is required when equipment is damaged.' });
  }
  if (damageDescription.length > 2000) {
    return res.status(400).json({ error: 'Damage description must be 2000 characters or fewer.' });
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const bkRes = await client.query('SELECT * FROM Bookings WHERE BookingID=$1 FOR UPDATE', [bookingId]);
    if (bkRes.rowCount === 0) throw { status: 404, message: 'Booking not found.' };
    const booking = bkRes.rows[0];
    if (!['Issued', 'Overdue'].includes(booking.status)) {
      throw { status: 409, message: `Cannot record a return for a booking with status ${booking.status}.` };
    }

    const eqRes = await client.query('SELECT * FROM Equipment WHERE EquipmentID=$1 FOR UPDATE', [booking.equipmentid]);
    const eq = eqRes.rows[0];

    await client.query(
      `INSERT INTO Returns (BookingID, ReturnDate, EquipmentCondition) VALUES ($1, CURRENT_DATE, $2)`,
      [bookingId, equipmentCondition]
    );

    let newQuantity = eq.quantity;
    let newAvailable = equipmentCondition === 'Damaged'
      ? eq.availablequantity
      : eq.availablequantity + booking.quantity;
    let newCondition = eq.condition;

    if (equipmentCondition === 'Lost') {
      newQuantity = Math.max(0, eq.quantity - booking.quantity);
      newAvailable = Math.max(0, newAvailable - booking.quantity); // lost units leave circulation entirely
      await client.query(
        `INSERT INTO Fines (BookingID, UserID, Reason, Amount) VALUES ($1,$2,'Lost Equipment',$3)`,
        [bookingId, booking.userid, FINE_LOST]
      );
      await client.query(
        `INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)`,
        [booking.userid, `Booking ${booking.bookingid} was marked as Lost. A fine of ₹${FINE_LOST} has been applied.`]
      );
    } else if (equipmentCondition === 'Damaged') {
      newCondition = 'Under Repair';
      const reportRes = await client.query(
        `INSERT INTO DamageReports (EquipmentID, UserID, BookingID, Description, Image, Status)
         VALUES ($1,$2,$3,$4,$5,'Confirmed') RETURNING ReportID`,
        [eq.equipmentid, booking.userid, bookingId, damageDescription, imagePath]
      );
      await client.query(
        `INSERT INTO Fines (BookingID, UserID, Reason, Amount) VALUES ($1,$2,'Damage',$3)`,
        [bookingId, booking.userid, FINE_DAMAGE]
      );
      await client.query(
        `INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)`,
        [booking.userid, `Damage report ${reportRes.rows[0].reportid} was recorded by the admin. A fine of ₹${FINE_DAMAGE} has been applied.`]
      );
    }

    const newStatus = computeEquipmentStatus({ quantity: newQuantity, availableQuantity: newAvailable, condition: newCondition });
    await client.query(
      `UPDATE Equipment SET Quantity=$1, AvailableQuantity=$2, Condition=$3, Status=$4 WHERE EquipmentID=$5`,
      [newQuantity, newAvailable, newCondition, newStatus, eq.equipmentid]
    );

    await client.query(`UPDATE Bookings SET Status='Returned' WHERE BookingID=$1`, [bookingId]);
    if (equipmentCondition !== 'Lost') {
      await client.query(
        `INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)`,
        [booking.userid, `Your return for booking ${booking.bookingid} was recorded as "${equipmentCondition}".`]
      );
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Return recorded.' });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not record return.' });
  } finally {
    client.release();
  }
});

module.exports = router;
