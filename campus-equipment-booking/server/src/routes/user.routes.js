const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/me
router.get('/me', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT UserID, Name, Email, Role, Department, Phone, CreatedAt FROM Users WHERE UserID = $1',
      [req.user.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch profile.' });
  }
});

// GET /api/users — Admin only
router.get('/', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const result = await db.query(
      'SELECT UserID, Name, Email, Role, Department, Phone, CreatedAt FROM Users ORDER BY Name'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch users.' });
  }
});

module.exports = router;
