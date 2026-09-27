const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { FINE_DAMAGE } = require('../utils/fines');

const router = express.Router();

// GET /api/damage-reports — Coordinator/Admin view all; Student view own
router.get('/', requireAuth, async (req, res) => {
  try {
    let sql = `SELECT d.*, u.Name AS studentname, e.Name AS equipmentname
               FROM DamageReports d
               JOIN Users u ON u.UserID = d.UserID
               JOIN Equipment e ON e.EquipmentID = d.EquipmentID`;
    const params = [];
    if (req.user.role === 'Student') {
      sql += ` WHERE d.UserID = $1`;
      params.push(req.user.userId);
    }
    sql += ' ORDER BY d.CreatedAt DESC';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch damage reports.' });
  }
});

// POST /api/damage-reports — Student submits (multipart/form-data with optional "image" file)
router.post('/', requireAuth, requireRole('Student'), upload.single('image'), async (req, res) => {
  const { equipmentId, bookingId, description } = req.body;
  if (!equipmentId || !description) {
    return res.status(400).json({ error: 'equipmentId and description are required.' });
  }
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  try {
    const result = await db.query(
      `INSERT INTO DamageReports (EquipmentID, UserID, BookingID, Description, Image, Status)
       VALUES ($1,$2,$3,$4,$5,'Under Review') RETURNING *`,
      [equipmentId, req.user.userId, bookingId || null, description, imagePath]
    );
    await db.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [
      req.user.userId,
      `Damage report ${result.rows[0].reportid} submitted for review.`,
    ]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not submit damage report.' });
  }
});

// PATCH /api/damage-reports/:id/review — Coordinator/Admin: { decision: 'Confirmed' | 'Dismissed' }
router.patch('/:id/review', requireAuth, requireRole('Coordinator', 'Admin'), async (req, res) => {
  const { decision } = req.body;
  if (!['Confirmed', 'Dismissed'].includes(decision)) {
    return res.status(400).json({ error: "decision must be 'Confirmed' or 'Dismissed'." });
  }
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const reportRes = await client.query('SELECT * FROM DamageReports WHERE ReportID=$1 FOR UPDATE', [req.params.id]);
    if (reportRes.rowCount === 0) throw { status: 404, message: 'Damage report not found.' };
    const report = reportRes.rows[0];
    if (report.status !== 'Under Review') throw { status: 409, message: 'This report has already been reviewed.' };

    await client.query('UPDATE DamageReports SET Status=$1 WHERE ReportID=$2', [decision, req.params.id]);

    if (decision === 'Confirmed') {
      await client.query(
        `INSERT INTO Fines (BookingID, UserID, Reason, Amount) VALUES ($1,$2,'Damage',$3)`,
        [report.bookingid, report.userid, FINE_DAMAGE]
      );
      const eqRes = await client.query('SELECT * FROM Equipment WHERE EquipmentID=$1 FOR UPDATE', [report.equipmentid]);
      const eq = eqRes.rows[0];
      const newCondition = eq.condition === 'New' || eq.condition === 'Good' ? 'Fair' : 'Under Repair';
      await client.query('UPDATE Equipment SET Condition=$1 WHERE EquipmentID=$2', [newCondition, eq.equipmentid]);
      await client.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [
        report.userid,
        `Damage report ${report.reportid} confirmed. A fine of ₹${FINE_DAMAGE} has been applied.`,
      ]);
    } else {
      await client.query('INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)', [
        report.userid,
        `Damage report ${report.reportid} was reviewed — no fine applied.`,
      ]);
    }

    await client.query('COMMIT');
    res.json({ message: `Report ${decision.toLowerCase()}.` });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'Could not review damage report.' });
  } finally {
    client.release();
  }
});

module.exports = router;
