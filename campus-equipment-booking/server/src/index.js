require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const db = require('./db');

const { migrate } = require('./migrate');
const { seed } = require('./seed');
const { runOverdueSweep } = require('./jobs/overdueSweep');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const equipmentRoutes = require('./routes/equipment.routes');
const bookingRoutes = require('./routes/booking.routes');
const returnRoutes = require('./routes/return.routes');
const damageRoutes = require('./routes/damage.routes');
const notificationRoutes = require('./routes/notification.routes');
const fineRoutes = require('./routes/fine.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

async function initializeDatabase() {
  if (process.env.USE_PG_MEM === 'true') {
    try {
      await migrate();
      await seed({ closeConnection: false });
      console.log('✔ pg-mem database initialized for local development.');
    } catch (err) {
      console.error('Database initialization failed:', err.message);
      process.exitCode = 1;
      return;
    }
  }

  await db.query('ALTER TABLE Users ADD COLUMN IF NOT EXISTS EmailVerified BOOLEAN NOT NULL DEFAULT TRUE');
}

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/damage-reports', damageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/fines', fineRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Fallback error handler (e.g. multer file-type/size errors)
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Something went wrong.' });
});

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));

const PORT = process.env.PORT || 4000;

initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`CourtSide API listening on http://localhost:${PORT}`);
  });

  // Run once at boot, then every 30 minutes
  runOverdueSweep();
  cron.schedule('*/30 * * * *', runOverdueSweep);
});
