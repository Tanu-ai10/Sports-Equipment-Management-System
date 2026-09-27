import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import Shell from '../components/Shell.jsx';
import AddEquipmentModal from '../components/AddEquipmentModal.jsx';
import { StatCard, EmptyState, Toast } from '../components/Shared.jsx';
import { useToast, errorMessage } from '../hooks.js';
import api from '../api.js';

const TABS = [['overview', 'Overview'], ['equipment', 'Equipment'], ['bookings', 'Booking Stats'], ['fines', 'Fine Collection']];

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [overview, setOverview] = useState(null);
  const [equipment, setEquipment] = useState([]);
  const [fines, setFines] = useState({ fines: [], total: 0 });
  const [showAddEq, setShowAddEq] = useState(false);
  const [toast, showToast] = useToast();

  const loadOverview = useCallback(async () => {
    const res = await api.get('/dashboard/admin');
    setOverview(res.data);
  }, []);
  const loadEquipment = useCallback(async () => {
    const res = await api.get('/equipment');
    setEquipment(res.data);
  }, []);
  const loadFines = useCallback(async () => {
    const res = await api.get('/fines');
    setFines(res.data);
  }, []);

  useEffect(() => { loadOverview(); loadEquipment(); loadFines(); }, [loadOverview, loadEquipment, loadFines]);

  async function handleAddEquipment({ name, sport, quantity, location, description, file }) {
    try {
      const form = new FormData();
      form.append('name', name);
      form.append('sport', sport);
      form.append('quantity', quantity);
      form.append('location', location);
      form.append('description', description);
      if (file) form.append('image', file);
      await api.post('/equipment', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      showToast('Equipment added to catalog.');
      setShowAddEq(false);
      loadEquipment();
      loadOverview();
    } catch (err) {
      showToast(errorMessage(err, 'Could not add equipment.'));
    }
  }

  return (
    <Shell tabs={TABS} activeTab={tab} onTabChange={setTab}>
      {tab === 'overview' && <OverviewTab overview={overview} />}
      {tab === 'equipment' && <EquipmentTab equipment={equipment} onAdd={() => setShowAddEq(true)} />}
      {tab === 'bookings' && <BookingsTab overview={overview} />}
      {tab === 'fines' && <FinesTab fines={fines} />}

      {showAddEq && <AddEquipmentModal onClose={() => setShowAddEq(false)} onSubmit={handleAddEquipment} />}
      <Toast message={toast} />
    </Shell>
  );
}

function OverviewTab({ overview }) {
  if (!overview) return <div className="center-spinner">Loading…</div>;
  const chartData = overview.mostBorrowed.map((r) => ({ name: r.name, count: Number(r.total_booked) }));
  return (
    <>
      <div className="section-head"><div><h2>Admin Overview</h2><div className="section-sub">Snapshot of catalog health & booking activity.</div></div></div>
      <div className="stat-row">
        <StatCard num={overview.totalEquipmentUnits} label="Total Equipment Units" />
        <StatCard num={overview.underMaintenance} label="Under Maintenance" />
        <StatCard num={overview.bookingsThisMonth} label="Bookings This Month" />
        <StatCard num={`₹${overview.totalFinesLevied}`} label="Total Fines Levied" />
      </div>
      <div className="chart-wrap">
        <h3 style={{ fontSize: 15, margin: '0 0 14px', color: 'var(--charcoal)', textTransform: 'none', fontFamily: 'Inter', fontWeight: 700 }}>Most Borrowed Items</h3>
        {chartData.length === 0 ? (
          <EmptyState icon="📊">No booking activity yet.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DAD5C7" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#1F4D36" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

function EquipmentTab({ equipment, onAdd }) {
  return (
    <>
      <div className="section-head">
        <div><h2>Equipment Management</h2><div className="section-sub">Full catalog across all sports.</div></div>
        <button className="row-btn approve" style={{ padding: '9px 16px' }} onClick={onAdd}>+ Add Equipment</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Sport</th><th>Qty / Available</th><th>Condition</th><th>Location</th><th>Status</th></tr></thead>
          <tbody>
            {equipment.map((e) => (
              <tr key={e.equipmentid}>
                <td className="mono">EQ-{String(e.equipmentid).padStart(3, '0')}</td>
                <td>{e.name}</td><td>{e.sport}</td>
                <td>{e.quantity} / {e.availablequantity}</td>
                <td>{e.condition}</td><td>{e.location}</td>
                <td><span className={`status-pill status-${e.status}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function BookingsTab({ overview }) {
  if (!overview) return <div className="center-spinner">Loading…</div>;
  const sportData = overview.bookingsBySport.map((r) => ({ name: r.sport, count: Number(r.total) }));
  return (
    <>
      <div className="section-head"><div><h2>Booking Statistics</h2><div className="section-sub">Activity broken down by sport & status.</div></div></div>
      <div className="stat-row">
        {overview.bookingsByStatus.length === 0 && <EmptyState icon="📊">No bookings yet.</EmptyState>}
        {overview.bookingsByStatus.map((s) => <StatCard key={s.status} num={s.total} label={s.status} />)}
      </div>
      <div className="chart-wrap">
        <h3 style={{ fontSize: 15, margin: '0 0 14px', color: 'var(--charcoal)', textTransform: 'none', fontFamily: 'Inter', fontWeight: 700 }}>Bookings by Sport</h3>
        {sportData.length === 0 ? (
          <EmptyState icon="📊">No data yet.</EmptyState>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sportData} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DAD5C7" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#2C4A6E" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </>
  );
}

function FinesTab({ fines }) {
  return (
    <>
      <div className="section-head"><div><h2>Fine Collection</h2><div className="section-sub">All penalties issued across students.</div></div></div>
      <div className="fine-total-card">
        <div><div className="num">₹{fines.total}</div><div className="lbl">Total fines levied</div></div>
        <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', maxWidth: 260 }}>Includes late-return, damage & lost-equipment penalties.</div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Fine</th><th>Student</th><th>Equipment</th><th>Reason</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {fines.fines.length === 0 && <tr><td colSpan={6}><EmptyState icon="✅">No fines recorded.</EmptyState></td></tr>}
            {fines.fines.map((f) => (
              <tr key={f.fineid}>
                <td className="mono">FN-{f.fineid}</td><td>{f.studentname}</td><td>{f.equipmentname || '—'}</td>
                <td>{f.reason}</td><td>₹{f.amount}</td>
                <td>{f.paidstatus ? <span className="status-tag tag-Returned">Paid</span> : <span className="status-tag tag-Pending">Unpaid</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
