const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/fines/mine — student's own fines
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, b.EquipmentID, e.Name AS equipmentname
       FROM Fines f
       LEFT JOIN Bookings b ON b.BookingID = f.BookingID
       LEFT JOIN Equipment e ON e.EquipmentID = b.EquipmentID
       WHERE f.UserID = $1 ORDER BY f.CreatedAt DESC`,
      [req.user.userId]
    );
    const total = result.rows.reduce((sum, f) => sum + Number(f.amount), 0);
    res.json({ fines: result.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch fines.' });
  }
});

// GET /api/fines — Admin: all fines across all students
router.get('/', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.*, u.Name AS studentname, e.Name AS equipmentname
       FROM Fines f
       JOIN Users u ON u.UserID = f.UserID
       LEFT JOIN Bookings b ON b.BookingID = f.BookingID
       LEFT JOIN Equipment e ON e.EquipmentID = b.EquipmentID
       ORDER BY f.CreatedAt DESC`
    );
    const total = result.rows.reduce((sum, f) => sum + Number(f.amount), 0);
    res.json({ fines: result.rows, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch fines.' });
  }
});

// PATCH /api/fines/:id/pay — Admin marks a fine as paid
router.patch('/:id/pay', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.query('UPDATE Fines SET PaidStatus = TRUE WHERE FineID = $1 RETURNING *', [req.params.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Fine not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update fine.' });
  }
});

module.exports = router;
