const FINE_LATE_PER_DAY = Number(process.env.FINE_LATE_PER_DAY || 50);
const FINE_DAMAGE = Number(process.env.FINE_DAMAGE || 200);
const FINE_LOST = Number(process.env.FINE_LOST || 500);

function daysBetween(dateA, dateB) {
  const a = new Date(dateA);
  const b = new Date(dateB);
  return Math.max(0, Math.round((b - a) / 86400000));
}

/** Equipment is expected back the day after the booked date (single-day slot model). */
function expectedReturnDate(bookingDateStr) {
  const d = new Date(bookingDateStr);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function computeEquipmentStatus({ quantity, availableQuantity, condition }) {
  if (condition === 'Under Repair') return 'Maintenance';
  if (availableQuantity <= 0) return 'Unavailable';
  if (availableQuantity <= Math.max(1, Math.round(quantity * 0.25))) return 'Limited';
  return 'Available';
}

module.exports = {
  FINE_LATE_PER_DAY,
  FINE_DAMAGE,
  FINE_LOST,
  daysBetween,
  expectedReturnDate,
  computeEquipmentStatus,
};
