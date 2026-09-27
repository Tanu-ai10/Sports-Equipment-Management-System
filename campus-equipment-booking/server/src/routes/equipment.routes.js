const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { computeEquipmentStatus } = require('../utils/fines');

const router = express.Router();

// GET /api/equipment?sport=&name=&availability=available&popular=true&date=&timeSlot=
router.get('/', requireAuth, async (req, res) => {
  const { sport, name, availability, popular, date, timeSlot } = req.query;
  const clauses = [];
  const params = [];

  if (sport) { params.push(sport); clauses.push(`Sport = $${params.length}`); }
  if (name) { params.push(`%${name.toLowerCase()}%`); clauses.push(`LOWER(Name) LIKE $${params.length}`); }
  if (availability === 'available') { clauses.push('AvailableQuantity > 0'); }

  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    let sql = `SELECT * FROM Equipment ${where} ORDER BY Sport, Name`;

    if (popular === 'true') {
      // "Popular" = ranked by total quantity ever booked
      sql = `
        SELECT e.*, COALESCE(b.total_booked, 0) AS popularity
        FROM Equipment e
        LEFT JOIN (
          SELECT EquipmentID, SUM(Quantity) AS total_booked
          FROM Bookings
          GROUP BY EquipmentID
        ) b ON b.EquipmentID = e.EquipmentID
        ${where}
        ORDER BY popularity DESC
        LIMIT 10
      `;
    }

    const result = await db.query(sql, params);

    // Optional: if date + timeSlot given, annotate real-time availability for that slot
    if (date && timeSlot) {
      const bookedRes = await db.query(
        `SELECT EquipmentID, COALESCE(SUM(Quantity),0) AS booked
         FROM Bookings
         WHERE Date = $1 AND TimeSlot = $2 AND Status IN ('Pending','Approved','Issued')
         GROUP BY EquipmentID`,
        [date, timeSlot]
      );
      const bookedMap = Object.fromEntries(bookedRes.rows.map(r => [r.equipmentid, Number(r.booked)]));
      result.rows.forEach(r => {
        const alreadyBooked = bookedMap[r.equipmentid] || 0;
        r.slotAvailableQuantity = Math.max(0, r.quantity - alreadyBooked);
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch equipment.' });
  }
});

// GET /api/equipment/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM Equipment WHERE EquipmentID = $1', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Equipment not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch equipment.' });
  }
});

// POST /api/equipment  (Admin only) — supports optional image upload (multipart/form-data, field "image")
router.post('/', requireAuth, requireRole('Admin'), upload.single('image'), async (req, res) => {
  const { name, sport, description, quantity, condition, location } = req.body;
  if (!name || !sport || !quantity) {
    return res.status(400).json({ error: 'name, sport and quantity are required.' });
  }
  const qty = parseInt(quantity, 10);
  const status = computeEquipmentStatus({ quantity: qty, availableQuantity: qty, condition: condition || 'New' });
  const imagePath = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl || null);

  try {
    const result = await db.query(
      `INSERT INTO Equipment (Name, Sport, Image, Description, Quantity, AvailableQuantity, Condition, Location, Status)
       VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8) RETURNING *`,
      [name, sport, imagePath, description || null, qty, condition || 'New', location || null, status]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add equipment.' });
  }
});

// PATCH /api/equipment/:id  (Admin only) — update any editable field, recomputes Status
router.patch('/:id', requireAuth, requireRole('Admin'), upload.single('image'), async (req, res) => {
  try {
    const current = await db.query('SELECT * FROM Equipment WHERE EquipmentID = $1', [req.params.id]);
    if (current.rowCount === 0) return res.status(404).json({ error: 'Equipment not found.' });
    const eq = current.rows[0];

    const name = req.body.name ?? eq.name;
    const sport = req.body.sport ?? eq.sport;
    const description = req.body.description ?? eq.description;
    const quantity = req.body.quantity !== undefined ? parseInt(req.body.quantity, 10) : eq.quantity;
    const availableQuantity = req.body.availableQuantity !== undefined ? parseInt(req.body.availableQuantity, 10) : eq.availablequantity;
    const condition = req.body.condition ?? eq.condition;
    const location = req.body.location ?? eq.location;
    const image = req.file ? `/uploads/${req.file.filename}` : (req.body.imageUrl ?? eq.image);

    const status = computeEquipmentStatus({ quantity, availableQuantity, condition });

    const result = await db.query(
      `UPDATE Equipment SET Name=$1, Sport=$2, Image=$3, Description=$4, Quantity=$5,
       AvailableQuantity=$6, Condition=$7, Location=$8, Status=$9
       WHERE EquipmentID=$10 RETURNING *`,
      [name, sport, image, description, quantity, availableQuantity, condition, location, status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update equipment.' });
  }
});

// DELETE /api/equipment/:id  (Admin only)
router.delete('/:id', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM Equipment WHERE EquipmentID = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete equipment. It may have existing bookings.' });
  }
});

module.exports = router;
