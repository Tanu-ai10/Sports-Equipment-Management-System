const db = require('../db');
const { FINE_LATE_PER_DAY, daysBetween, expectedReturnDate } = require('../utils/fines');

/**
 * Finds all Issued bookings whose expected return date has passed, flips them to
 * Overdue, applies a late fine, and notifies the student. Safe to run repeatedly —
 * only acts on bookings still in Issued status.
 */
async function runOverdueSweep() {
  const client = await db.getClient();
  try {
    const issuedRes = await client.query(`SELECT * FROM Bookings WHERE Status = 'Issued'`);
    for (const booking of issuedRes.rows) {
      const expected = expectedReturnDate(booking.date);
      const today = new Date().toISOString().slice(0, 10);
      if (today > expected) {
        const daysLate = daysBetween(expected, today);
        const fineAmount = daysLate * FINE_LATE_PER_DAY;

        await client.query('BEGIN');
        await client.query(`UPDATE Bookings SET Status = 'Overdue' WHERE BookingID = $1`, [booking.bookingid]);
        await client.query(
          `INSERT INTO Fines (BookingID, UserID, Reason, Amount) VALUES ($1,$2,'Late Return',$3)`,
          [booking.bookingid, booking.userid, fineAmount]
        );
        await client.query(
          `INSERT INTO Notifications (UserID, Message) VALUES ($1,$2)`,
          [booking.userid, `Booking ${booking.bookingid} is overdue. A fine of ₹${fineAmount} has been applied.`]
        );
        await client.query('COMMIT');
        console.log(`[overdue-sweep] Booking ${booking.bookingid} marked Overdue, fine ₹${fineAmount}`);
      }
    }
  } catch (err) {
    console.error('[overdue-sweep] failed:', err.message);
  } finally {
    client.release();
  }
}

module.exports = { runOverdueSweep };
