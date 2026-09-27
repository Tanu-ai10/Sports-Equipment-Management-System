const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications — current user's notifications
router.get('/', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM Notifications WHERE UserID = $1 ORDER BY CreatedAt DESC',
      [req.user.userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      'UPDATE Notifications SET ReadStatus = TRUE WHERE NotificationID = $1 AND UserID = $2 RETURNING *',
      [req.params.id, req.user.userId]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Notification not found.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update notification.' });
  }
});

module.exports = router;
