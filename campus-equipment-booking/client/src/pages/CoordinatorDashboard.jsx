import { useState, useEffect, useCallback } from 'react';
import Shell from '../components/Shell.jsx';
import ReturnModal from '../components/ReturnModal.jsx';
import { StatusTag, EmptyState, Toast, fmtDate } from '../components/Shared.jsx';
import { useToast, errorMessage } from '../hooks.js';
import api from '../api.js';

const TABS = [['requests', 'Requests'], ['today', "Today's Bookings"], ['due', 'Due Today'], ['overdue', 'Overdue'], ['damage', 'Damage Reports']];

export default function CoordinatorDashboard() {
  const [tab, setTab] = useState('requests');
  const [pending, setPending] = useState([]);
  const [today, setToday] = useState([]);
  const [due, setDue] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [damageReports, setDamageReports] = useState([]);
  const [returnModalBooking, setReturnModalBooking] = useState(null);
  const [toast, showToast] = useToast();

  const loadAll = useCallback(async () => {
    const [p, t, d, o, dr] = await Promise.all([
      api.get('/bookings', { params: { status: 'Pending' } }),
      api.get('/bookings', { params: { date: 'today' } }),
      api.get('/bookings', { params: { dueToday: 'true' } }),
      api.get('/bookings', { params: { overdue: 'true' } }),
      api.get('/damage-reports'),
    ]);
    setPending(p.data);
    setToday(t.data);
    setDue(d.data);
    setOverdue(o.data);
    setDamageReports(dr.data);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function approve(id) {
    try { await api.patch(`/bookings/${id}/approve`); showToast('Booking approved.'); loadAll(); }
    catch (err) { showToast(errorMessage(err, 'Could not approve booking.')); }
  }
  async function reject(id) {
    try { await api.patch(`/bookings/${id}/reject`); showToast('Booking rejected.'); loadAll(); }
    catch (err) { showToast(errorMessage(err, 'Could not reject booking.')); }
  }
  async function issue(id) {
    try { await api.patch(`/bookings/${id}/issue`); showToast('Equipment issued.'); loadAll(); }
    catch (err) { showToast(errorMessage(err, 'Could not issue equipment.')); }
  }
  async function handleReturnSubmit(payload) {
    try {
      await api.post('/returns', payload);
      showToast('Return recorded.');
      setReturnModalBooking(null);
      loadAll();
    } catch (err) { showToast(errorMessage(err, 'Could not record return.')); }
  }
  async function reviewDamage(id, decision) {
    try { await api.patch(`/damage-reports/${id}/review`, { decision }); showToast(`Report ${decision.toLowerCase()}.`); loadAll(); }
    catch (err) { showToast(errorMessage(err, 'Could not review report.')); }
  }

  return (
    <Shell tabs={TABS} activeTab={tab} onTabChange={setTab} badges={{ requests: pending.length }}>
      {tab === 'requests' && <RequestsTab list={pending} onApprove={approve} onReject={reject} />}
      {tab === 'today' && <TodayTab list={today} onIssue={issue} onReturn={setReturnModalBooking} />}
      {tab === 'due' && <DueTab list={due} onReturn={setReturnModalBooking} />}
      {tab === 'overdue' && <OverdueTab list={overdue} onReturn={setReturnModalBooking} />}
      {tab === 'damage' && <DamageTab list={damageReports} onReview={reviewDamage} />}

      {returnModalBooking && (
        <ReturnModal booking={returnModalBooking} onClose={() => setReturnModalBooking(null)} onSubmit={handleReturnSubmit} />
      )}
      <Toast message={toast} />
    </Shell>
  );
}

function RequestsTab({ list, onApprove, onReject }) {
  return (
    <>
      <div className="section-head"><div><h2>Pending Requests</h2><div className="section-sub">Review and approve or reject booking requests.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Student</th><th>Equipment</th><th>Date / Slot</th><th>Qty</th><th>Purpose</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><EmptyState icon="📭">No pending requests right now.</EmptyState></td></tr>}
            {list.map((b) => (
              <tr key={b.bookingid}>
                <td className="mono">BK-{b.bookingid}</td><td>{b.studentname}</td><td>{b.equipmentname}</td>
                <td>{fmtDate(b.date)}<br /><span style={{ color: 'var(--ink-soft)', fontSize: 11.5 }}>{b.timeslot}</span></td>
                <td>{b.quantity}</td><td>{b.purpose}</td>
                <td>
                  <button className="row-btn approve" onClick={() => onApprove(b.bookingid)}>Approve</button>
                  <button className="row-btn reject" onClick={() => onReject(b.bookingid)}>Reject</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function TodayTab({ list, onIssue, onReturn }) {
  return (
    <>
      <div className="section-head"><div><h2>Today's Bookings</h2><div className="section-sub">Approved bookings ready for issue.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Student</th><th>Equipment</th><th>Slot</th><th>Qty</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><EmptyState icon="📅">Nothing scheduled for today.</EmptyState></td></tr>}
            {list.map((b) => (
              <tr key={b.bookingid}>
                <td className="mono">BK-{b.bookingid}</td><td>{b.studentname}</td><td>{b.equipmentname}</td><td>{b.timeslot}</td><td>{b.quantity}</td>
                <td><StatusTag status={b.status} /></td>
                <td>
                  {b.status === 'Approved'
                    ? <button className="row-btn issue" onClick={() => onIssue(b.bookingid)}>Confirm Issue</button>
                    : <button className="row-btn neutral" onClick={() => onReturn(b)}>Mark Returned</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DueTab({ list, onReturn }) {
  return (
    <>
      <div className="section-head"><div><h2>Equipment Due Today</h2><div className="section-sub">Issued equipment expected back today.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Student</th><th>Equipment</th><th>Qty</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5}><EmptyState icon="📦">Nothing due back today.</EmptyState></td></tr>}
            {list.map((b) => (
              <tr key={b.bookingid}>
                <td className="mono">BK-{b.bookingid}</td><td>{b.studentname}</td><td>{b.equipmentname}</td><td>{b.quantity}</td>
                <td><button className="row-btn neutral" onClick={() => onReturn(b)}>Mark Returned</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function OverdueTab({ list, onReturn }) {
  return (
    <>
      <div className="section-head"><div><h2>Overdue Equipment</h2><div className="section-sub">Items past their expected return date.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Booking</th><th>Student</th><th>Equipment</th><th>Issued</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={5}><EmptyState icon="✅">No overdue equipment.</EmptyState></td></tr>}
            {list.map((b) => (
              <tr key={b.bookingid}>
                <td className="mono">BK-{b.bookingid}</td><td>{b.studentname}</td><td>{b.equipmentname}</td><td>{fmtDate(b.date)}</td>
                <td><button className="row-btn neutral" onClick={() => onReturn(b)}>Mark Returned</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function DamageTab({ list, onReview }) {
  return (
    <>
      <div className="section-head"><div><h2>Damage Reports</h2><div className="section-sub">Review student-submitted damage reports.</div></div></div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Report</th><th>Student</th><th>Equipment</th><th>Description</th><th>Photo</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {list.length === 0 && <tr><td colSpan={7}><EmptyState icon="🛠️">No damage reports.</EmptyState></td></tr>}
            {list.map((r) => (
              <tr key={r.reportid}>
                <td className="mono">DR-{r.reportid}</td><td>{r.studentname}</td><td>{r.equipmentname}</td>
                <td style={{ maxWidth: 220 }}>{r.description}</td>
                <td>{r.image ? <a href={r.image} target="_blank" rel="noreferrer">View</a> : '—'}</td>
                <td>
                  <span className={`status-tag ${r.status === 'Confirmed' ? 'tag-Rejected' : r.status === 'Dismissed' ? 'tag-Returned' : 'tag-Pending'}`}>{r.status}</span>
                </td>
                <td>
                  {r.status === 'Under Review' ? (
                    <>
                      <button className="row-btn reject" onClick={() => onReview(r.reportid, 'Confirmed')}>Confirm (Fine)</button>
                      <button className="row-btn neutral" onClick={() => onReview(r.reportid, 'Dismissed')}>Dismiss</button>
                    </>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
