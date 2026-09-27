import { useState } from 'react';
import { TIME_SLOTS, PURPOSES, todayStr } from '../constants.js';

export default function BookingModal({ equipment, onClose, onSubmit }) {
  const [date, setDate] = useState(todayStr());
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [quantity, setQuantity] = useState(1);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ equipmentId: equipment.equipmentid, date, timeSlot, quantity: Number(quantity), purpose });
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Book {equipment.name}</h3>
        <div className="modal-sub">{equipment.sport} · {equipment.availablequantity} of {equipment.quantity} available</div>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Date</label>
          <input className="input" type="date" min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} required />
          <label className="field-label">Time Slot</label>
          <select className="input" value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
            {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="field-label">Quantity</label>
          <input className="input" type="number" min={1} max={equipment.availablequantity} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
          <label className="field-label">Purpose</label>
          <div className="purpose-choices">
            {PURPOSES.map((p) => (
              <button type="button" key={p} className={`purpose-chip ${purpose === p ? 'active' : ''}`} onClick={() => setPurpose(p)}>{p}</button>
            ))}
          </div>
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</button>
        </form>
      </div>
    </div>
  );
}
