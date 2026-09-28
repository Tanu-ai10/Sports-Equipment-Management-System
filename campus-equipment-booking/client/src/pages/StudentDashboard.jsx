import { useState, useEffect, useCallback } from 'react';
import Shell from '../components/Shell.jsx';
import BookingModal from '../components/BookingModal.jsx';
import DamageModal from '../components/DamageModal.jsx';
import { StatusTag, EmptyState, Toast, fmtDate } from '../components/Shared.jsx';
import { useToast, errorMessage } from '../hooks.js';
import { SPORTS, SPORT_ICON } from '../constants.js';
import api from '../api.js';

const TABS = [['catalog', 'Catalog'], ['mybookings', 'My Bookings'], ['fines', 'Fines'], ['notifications', 'Notifications']];

export default function StudentDashboard() {
  const [tab, setTab] = useState('catalog');
  const [equipment, setEquipment] = useState([]);
  const [equipmentOptions, setEquipmentOptions] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [fines, setFines] = useState({ fines: [], total: 0 });
  const [notifications, setNotifications] = useState([]);
  const [filters, setFilters] = useState({ sport: '', equipmentId: '', availability: '', popular: false });
  const [bookingModalEq, setBookingModalEq] = useState(null);
  const [damageModalBooking, setDamageModalBooking] = useState(null);
  const [toast, showToast] = useToast();

  const loadEquipment = useCallback(async () => {
    const params = {};
    if (filters.sport) params.sport = filters.sport;
    if (filters.equipmentId) params.equipmentId = filters.equipmentId;
    if (filters.availability) params.availability = filters.availability;
    if (filters.popular) params.popular = 'true';
    const res = await api.get('/equipment', { params });
    setEquipment(res.data);
  }, [filters]);

  const loadBookings = useCallback(async () => {
    const res = await api.get('/bookings/mine');
    setBookings(res.data);
  }, []);
  const loadFines = useCallback(async () => {
    const res = await api.get('/fines/mine');
    setFines(res.data);
  }, []);
  const loadNotifications = useCallback(async () => {
    const res = await api.get('/notifications');
    setNotifications(res.data);
  }, []);

  useEffect(() => { loadEquipment(); }, [loadEquipment]);
  useEffect(() => {
    let cancelled = false;
    const params = filters.sport ? { sport: filters.sport } : {};

    api.get('/equipment', { params })
      .then((res) => {
        if (!cancelled) setEquipmentOptions(res.data);
      })
      .catch(() => {
        if (!cancelled) setEquipmentOptions([]);
      });

    return () => { cancelled = true; };
  }, [filters.sport]);
  useEffect(() => { loadBookings(); loadFines(); loadNotifications(); }, [loadBookings, loadFines, loadNotifications]);

  async function refreshAll() {
    await Promise.all([loadEquipment(), loadBookings(), loadFines(), loadNotifications()]);
  }

  async function handleBookingSubmit(payload) {
    try {
      await api.post('/bookings', payload);
      showToast('Booking request submitted!');
      setBookingModalEq(null);
      await refreshAll();
    } catch (err) {
      showToast(errorMessage(err, 'Could not submit booking.'));
    }
  }

  async function cancelBooking(id) {
    try {
      await api.patch(`/bookings/${id}/cancel`);
      showToast('Booking cancelled.');
      await refreshAll();
    } catch (err) {
      showToast(errorMessage(err, 'Could not cancel booking.'));
    }
  }

  async function handleDamageSubmit({ equipmentId, bookingId, description, file }) {
    try {
      const form = new FormData();
      form.append('equipmentId', equipmentId);
      form.append('bookingId', bookingId);
      form.append('description', description);
      if (file) form.append('image', file);
      await api.post('/damage-reports', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Damage report submitted.');
      setDamageModalBooking(null);
      await refreshAll();
    } catch (err) {
      showToast(errorMessage(err, 'Could not submit damage report.'));
    }
  }

  async function markNotifRead(n) {
    if (n.readstatus) return;
    await api.patch(`/notifications/${n.notificationid}/read`);
    loadNotifications();
  }

  const unreadCount = notifications.filter((n) => !n.readstatus).length;

  return (
    <Shell tabs={TABS} activeTab={tab} onTabChange={setTab} badges={{ notifications: unreadCount }}>
      {tab === 'catalog' && (
        <CatalogTab equipment={equipment} equipmentOptions={equipmentOptions} filters={filters} setFilters={setFilters} onBook={setBookingModalEq} />
      )}
      {tab === 'mybookings' && (
        <MyBookingsTab bookings={bookings} onCancel={cancelBooking} onReportDamage={setDamageModalBooking} />
      )}
      {tab === 'fines' && <FinesTab fines={fines} />}
      {tab === 'notifications' && <NotificationsTab notifications={notifications} onRead={markNotifRead} />}

      {bookingModalEq && (
        <BookingModal equipment={bookingModalEq} onClose={() => setBookingModalEq(null)} onSubmit={handleBookingSubmit} />
      )}
      {damageModalBooking && (
        <DamageModal booking={damageModalBooking} onClose={() => setDamageModalBooking(null)} onSubmit={handleDamageSubmit} />
      )}
      <Toast message={toast} />
    </Shell>
  );
}

function CatalogTab({ equipment, equipmentOptions, filters, setFilters, onBook }) {
  return (
    <>
      <div className="section-head">
        <div><h2>Equipment Catalog</h2><div className="section-sub">Browse and book gear for practice, tournaments or events.</div></div>
      </div>
      <div className="filter-bar">
        <select className="grow" value={filters.sport} onChange={(e) => setFilters((f) => ({ ...f, sport: e.target.value, equipmentId: '' }))}>
          <option value="">All sports</option>
          {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="grow" value={filters.equipmentId} onChange={(e) => setFilters((f) => ({ ...f, equipmentId: e.target.value }))}>
          <option value="">All equipment</option>
          {equipmentOptions.map((eq) => <option key={eq.equipmentid} value={eq.equipmentid}>{eq.name}</option>)}
        </select>
        <select value={filters.availability} onChange={(e) => setFilters((f) => ({ ...f, availability: e.target.value }))}>
          <option value="">Any availability</option>
          <option value="available">Available only</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)' }}>
          <input type="checkbox" checked={filters.popular} onChange={(e) => setFilters((f) => ({ ...f, popular: e.target.checked }))} /> Popular only
        </label>
      </div>
      <div className="eq-grid">
        {equipment.length === 0 && <EmptyState icon="🔍">No equipment matches your filters.</EmptyState>}
        {equipment.map((eq) => {
          const disabled = eq.availablequantity <= 0 || eq.status === 'Maintenance';
          return (
            <div className="eq-card" key={eq.equipmentid}>
              <div className="eq-card-top">
                <span className="eq-id mono">EQ-{String(eq.equipmentid).padStart(3, '0')}</span>
                <span className={`status-pill status-${eq.status}`}>{eq.status}</span>
                <span className="eq-icon">{SPORT_ICON[eq.sport] || '🏆'}</span>
              </div>
              <div className="eq-card-body">
                <div className="eq-name">{eq.name}</div>
                <div className="eq-sport">{eq.sport}</div>
                <div className="eq-desc">{eq.description}</div>
                <div className="eq-meta"><span>Available: <b>{eq.availablequantity}/{eq.quantity}</b></span><span>{eq.location}</span></div>
                <div className="eq-meta"><span>Condition: <b>{eq.condition}</b></span></div>
                <button className="btn-book" disabled={disabled} onClick={() => onBook(eq)}>
                  {disabled ? 'Unavailable' : 'Book Now'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function MyBookingsTab({ bookings, onCancel, onReportDamage }) {
  return (
    <>
      <div className="section-head"><div><h2>My Bookings</h2><div className="section-sub">Active bookings, history & pending requests.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Equipment</th><th>Date / Slot</th><th>Qty</th><th>Purpose</th><th>Status</th><th>Fine</th><th>Actions</th></tr></thead>
          <tbody>
            {bookings.length === 0 && (
              <tr><td colSpan={8}><EmptyState icon="📋">No bookings yet — head to the Catalog to book equipment.</EmptyState></td></tr>
            )}
            {bookings.map((b) => {
              const canCancel = ['Pending', 'Approved'].includes(b.status);
              const canReportDamage = ['Issued', 'Returned'].includes(b.status);
              return (
                <tr key={b.bookingid}>
                  <td className="mono">BK-{b.bookingid}</td>
                  <td>{b.equipmentname}</td>
                  <td>{fmtDate(b.date)}<br /><span style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>{b.timeslot}</span></td>
                  <td>{b.quantity}</td>
                  <td>{b.purpose}</td>
                  <td><StatusTag status={b.status} /></td>
                  <td>{b.fine ? `₹${b.fine}` : '—'}</td>
                  <td>
                    {canCancel && <button className="row-btn neutral" onClick={() => onCancel(b.bookingid)}>Cancel</button>}
                    {canReportDamage && <button className="row-btn neutral" onClick={() => onReportDamage(b)}>Report Damage</button>}
                    {!canCancel && !canReportDamage && '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function FinesTab({ fines }) {
  return (
    <>
      <div className="section-head"><div><h2>Fines</h2><div className="section-sub">Penalties for late returns, damage or lost equipment.</div></div></div>
      <div className="fine-total-card">
        <div><div className="num">₹{fines.total}</div><div className="lbl">Total outstanding</div></div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', maxWidth: 260 }}>Settle fines with the sports office to keep your booking privileges active.</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fine</th><th>Equipment</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {fines.fines.length === 0 && <tr><td colSpan={5}><EmptyState icon="✅">No fines — you're all clear!</EmptyState></td></tr>}
            {fines.fines.map((f) => (
              <tr key={f.fineid}>
                <td className="mono">FN-{f.fineid}</td>
                <td>{f.equipmentname || '—'}</td>
                <td>{f.reason}</td>
                <td>₹{f.amount}</td>
                <td>{f.paidstatus ? <span className="status-tag tag-Returned">Paid</span> : <span className="status-tag tag-Pending">Unpaid</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function NotificationsTab({ notifications, onRead }) {
  return (
    <>
      <div className="section-head"><div><h2>Notifications</h2><div className="section-sub">Booking updates, reminders & alerts.</div></div></div>
      <div className="table-wrap">
        {notifications.length === 0 && <EmptyState icon="🔔">You're all caught up.</EmptyState>}
        {notifications.map((n) => (
          <div key={n.notificationid} className={`notif-item ${n.readstatus ? 'read' : 'unread'}`} onClick={() => onRead(n)}>
            <span className="notif-dot" />
            <div><div className="notif-msg">{n.message}</div><div className="notif-ts">{new Date(n.createdat).toLocaleString('en-IN')}</div></div>
          </div>
        ))}
      </div>
    </>
  );
}
