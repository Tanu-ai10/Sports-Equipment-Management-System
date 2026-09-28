const express = require('express');
const db = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();
const REPORT_COLUMNS = [
  'Record Type', 'ID', 'Student', 'Equipment', 'Sport', 'Booking Date', 'Time Slot',
  'Quantity', 'Purpose', 'Status', 'Total Quantity', 'Available Quantity', 'Condition',
  'Location', 'Fine Reason', 'Fine Amount', 'Fine Paid', 'Description', 'Return Date',
  'Booking ID', 'Created At',
];

function csvCell(value) {
  let text = value == null ? '' : String(value);
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

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
router.get('/operations', requireAuth, requireRole('Admin'), async (req, res) => {
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

// GET /api/dashboard/admin/report.csv — downloadable admin report
router.get('/admin/report.csv', requireAuth, requireRole('Admin'), async (req, res) => {
  try {
    const [equipment, bookings, fines, damageReports, returns] = await Promise.all([
      db.query(`SELECT EquipmentID AS id, Name AS equipment, Sport AS sport, Quantity AS total_quantity,
                       AvailableQuantity AS available_quantity, Condition AS condition, Location AS location,
                       Status AS status, CreatedAt AS created_at
                FROM Equipment ORDER BY Sport, Name`),
      db.query(`SELECT b.BookingID AS id, u.Name AS student, e.Name AS equipment, e.Sport AS sport,
                       b.Date AS booking_date, b.TimeSlot AS time_slot, b.Quantity AS quantity,
                       b.Purpose AS purpose, b.Status AS status, b.CreatedAt AS created_at
                FROM Bookings b JOIN Users u ON u.UserID = b.UserID
                JOIN Equipment e ON e.EquipmentID = b.EquipmentID
                ORDER BY b.Date DESC, b.CreatedAt DESC`),
      db.query(`SELECT f.FineID AS id, u.Name AS student, e.Name AS equipment, f.Reason AS fine_reason,
                       f.Amount AS amount, f.PaidStatus AS paid, f.CreatedAt AS created_at
                FROM Fines f JOIN Users u ON u.UserID = f.UserID
                LEFT JOIN Bookings b ON b.BookingID = f.BookingID
                LEFT JOIN Equipment e ON e.EquipmentID = b.EquipmentID
                ORDER BY f.CreatedAt DESC`),
      db.query(`SELECT d.ReportID AS id, u.Name AS student, e.Name AS equipment, e.Sport AS sport,
                       d.Description AS description, d.Status AS status, d.CreatedAt AS created_at
                FROM DamageReports d JOIN Users u ON u.UserID = d.UserID
                JOIN Equipment e ON e.EquipmentID = d.EquipmentID
                ORDER BY d.CreatedAt DESC`),
      db.query(`SELECT r.ReturnID AS id, b.BookingID AS booking_id, u.Name AS student,
                       e.Name AS equipment, e.Sport AS sport, b.Quantity AS quantity,
                       r.ReturnDate AS return_date, r.EquipmentCondition AS condition, r.CreatedAt AS created_at
                FROM Returns r JOIN Bookings b ON b.BookingID = r.BookingID
                JOIN Users u ON u.UserID = b.UserID
                JOIN Equipment e ON e.EquipmentID = b.EquipmentID
                ORDER BY r.ReturnDate DESC, r.CreatedAt DESC`),
    ]);

    const records = [
      ...equipment.rows.map((row) => ({ type: 'Equipment', ...row })),
      ...bookings.rows.map((row) => ({ type: 'Booking', ...row })),
      ...fines.rows.map((row) => ({ type: 'Fine', ...row })),
      ...damageReports.rows.map((row) => ({ type: 'Damage Report', ...row })),
      ...returns.rows.map((row) => ({ type: 'Return', ...row })),
    ];
    const csv = [
      csvRow(REPORT_COLUMNS),
      ...records.map((row) => csvRow([
        row.type, row.id, row.student, row.equipment, row.sport, row.booking_date,
        row.time_slot, row.quantity, row.purpose, row.status, row.total_quantity,
        row.available_quantity, row.condition, row.location, row.fine_reason,
        row.amount, row.paid, row.description, row.return_date, row.booking_id,
        row.created_at,
      ])),
    ].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="courtside-admin-report.csv"');
    res.send(`\uFEFF${csv}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not generate the admin report.' });
  }
});

module.exports = router;
