const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/student — active bookings, history, pending, fines, notifications summary
router.get('/student', requireAuth, requireRole('Student'), async (req, res) => {
  try {
    const uid = req.user.userId;
    const [active, pending, fines, unread] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM Bookings WHERE UserID=$1 AND Status IN ('Approved','Issued')`, [uid]),
      db.query(`SELECT COUNT(*) FROM Bookings WHERE UserID=$1 AND Status='Pending'`, [uid]),
      db.query(`SELECT COALESCE(SUM(Amount),0) AS total FROM Fines WHERE UserID=$1 AND PaidStatus=FALSE`, [uid]),
      db.query(`SELECT COUNT(*) FROM Notifications WHERE UserID=$1 AND ReadStatus=FALSE`, [uid]),
    ]);
    res.json({
      activeBookings: Number(active.rows[0].count),
      pendingRequests: Number(pending.rows[0].count),
      outstandingFines: Number(fines.rows[0].total),
      unreadNotifications: Number(unread.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

// GET /api/dashboard/coordinator — today's bookings, due today, overdue, damage reports
router.get('/coordinator', requireAuth, requireRole('Coordinator', 'Admin'), async (req, res) => {
  try {
    const [todayCount, dueCount, overdueCount, damageCount] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM Bookings WHERE Date = CURRENT_DATE AND Status IN ('Approved','Issued')`),
      db.query(`SELECT COUNT(*) FROM Bookings WHERE Status='Issued' AND Date = CURRENT_DATE`),
      db.query(`SELECT COUNT(*) FROM Bookings WHERE Status='Overdue'`),
      db.query(`SELECT COUNT(*) FROM DamageReports WHERE Status='Under Review'`),
    ]);
    res.json({
      todaysBookings: Number(todayCount.rows[0].count),
      dueToday: Number(dueCount.rows[0].count),
      overdue: Number(overdueCount.rows[0].count),
      pendingDamageReports: Number(damageCount.rows[0].count),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

// GET /api/dashboard/admin — totals, most borrowed, maintenance count, monthly bookings, fine collection
router.get('/admin', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const [totalEq, maintenance, monthlyBookings, fineTotal, mostBorrowed, bySport, byStatus] = await Promise.all([
      db.query(`SELECT COALESCE(SUM(Quantity),0) AS total FROM Equipment`),
      db.query(`SELECT COUNT(*) FROM Equipment WHERE Status='Maintenance'`),
      db.query(`SELECT COUNT(*) FROM Bookings WHERE date_trunc('month', CreatedAt) = date_trunc('month', now())`),
      db.query(`SELECT COALESCE(SUM(Amount),0) AS total FROM Fines`),
      db.query(`
        SELECT e.EquipmentID, e.Name, COALESCE(SUM(b.Quantity),0) AS total_booked
        FROM Equipment e LEFT JOIN Bookings b ON b.EquipmentID = e.EquipmentID
        GROUP BY e.EquipmentID, e.Name ORDER BY total_booked DESC LIMIT 6
      `),
      db.query(`
        SELECT e.Sport, COUNT(b.BookingID) AS total
        FROM Bookings b JOIN Equipment e ON e.EquipmentID = b.EquipmentID
        GROUP BY e.Sport ORDER BY total DESC
      `),
      db.query(`SELECT Status, COUNT(*) AS total FROM Bookings GROUP BY Status`),
    ]);

    res.json({
      totalEquipmentUnits: Number(totalEq.rows[0].total),
      underMaintenance: Number(maintenance.rows[0].count),
      bookingsThisMonth: Number(monthlyBookings.rows[0].count),
      totalFinesLevied: Number(fineTotal.rows[0].total),
      mostBorrowed: mostBorrowed.rows,
      bookingsBySport: bySport.rows,
      bookingsByStatus: byStatus.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load dashboard.' });
  }
});

module.exports = router;
