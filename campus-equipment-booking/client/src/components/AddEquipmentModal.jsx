import { useState } from 'react';
import { SPORTS } from '../constants.js';

export default function AddEquipmentModal({ onClose, onSubmit }) {
  const [name, setName] = useState('');
  const [sport, setSport] = useState(SPORTS[0]);
  const [quantity, setQuantity] = useState(5);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit({ name, sport, quantity: Number(quantity), location, description, file });
    setSubmitting(false);
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h3>Add Equipment</h3>
        <div className="modal-sub">Add a new item to the catalog.</div>
        <form onSubmit={handleSubmit}>
          <label className="field-label">Name</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Hockey Stick" />
          <div className="field-row">
            <div>
              <label className="field-label">Sport</label>
              <select className="input" value={sport} onChange={(e) => setSport(e.target.value)}>
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Quantity</label>
              <input className="input" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
            </div>
          </div>
          <label className="field-label">Location</label>
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Store Room A" />
          <label className="field-label">Description</label>
          <textarea className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description…" />
          <label className="field-label">Photo (optional)</label>
          <input className="input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0] || null)} />
          <button className="btn-primary" disabled={submitting}>{submitting ? 'Adding…' : 'Add to Catalog'}</button>
        </form>
      </div>
    </div>
  );
}
