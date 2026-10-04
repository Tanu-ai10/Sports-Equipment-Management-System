import { useState } from 'react';

export default function ReturnModal({ booking, onClose, onSubmit }) {
  const [condition, setCondition] = useState('Good');
  const [damageDescription, setDamageDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ bookingId: booking.bookingid, equipmentCondition: condition, damageDescription, file });
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
          {condition === 'Damaged' && (
            <>
              <label className="field-label">Damage report</label>
              <textarea
                className="input"
                value={damageDescription}
                onChange={(e) => setDamageDescription(e.target.value)}
                required
                placeholder="Describe the damage found during inspection"
              />
              <label className="field-label">Photo (optional)</label>
              <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
              <div className="section-sub">A damage report and fine will be recorded when you confirm this return.</div>
            </>
          )}
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Saving…' : 'Confirm Return'}</button>
        </form>
      </div>
    </div>
  );
}
