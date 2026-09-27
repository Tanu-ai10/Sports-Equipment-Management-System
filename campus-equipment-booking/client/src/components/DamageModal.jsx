import { useState } from 'react';

export default function DamageModal({ booking, onClose, onSubmit }) {
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ equipmentId: booking.equipmentid, bookingId: booking.bookingid, description, file });
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Report Damage</h3>
        <div className="modal-sub">{booking.equipmentname} — Booking {booking.bookingid}</div>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Describe the damage</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="e.g. Racket string snapped during play" />
          <label className="field-label">Photo (optional)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Report'}</button>
        </form>
      </div>
    </div>
  );
}
