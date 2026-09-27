import { useState } from 'react';

export default function ReturnModal({ booking, onClose, onSubmit }) {
  const [condition, setCondition] = useState('Good');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ bookingId: booking.bookingid, equipmentCondition: condition });
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Mark Returned</h3>
        <div className="modal-sub">{booking.equipmentname} — Booking {booking.bookingid}</div>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Equipment condition on return</label>
          <select className="input" value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="Good">Good — no issues</option>
            <option value="Fair">Fair — minor wear</option>
            <option value="Damaged">Damaged</option>
            <option value="Lost">Lost (not returned)</option>
          </select>
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Confirm Return'}</button>
        </form>
      </div>
    </div>
  );
}
