const bcrypt = require('bcryptjs');
const { pool } = require('./db');

const SPORTS_EQUIPMENT = [
  ['Match Football', 'Football', 'FIFA-quality size-5 ball, ideal for practice & matches.', 10, 7, 'Good', 'Store Room A', 'Available'],
  ['Basketball', 'Basketball', 'Indoor/outdoor composite leather basketball.', 8, 2, 'Good', 'Store Room A', 'Limited'],
  ['Cricket Kit (Full)', 'Cricket', 'Bat, pads, gloves & helmet — full batting kit.', 5, 0, 'Fair', 'Store Room B', 'Unavailable'],
  ['Badminton Racket', 'Badminton', 'Carbon-fibre racket, medium flex, strung.', 16, 11, 'Good', 'Store Room C', 'Available'],
  ['Shuttlecocks (Tube of 6)', 'Badminton', 'Feather shuttlecocks, tournament grade.', 20, 14, 'New', 'Store Room C', 'Available'],
  ['TT Racket Pair', 'Table Tennis', 'Rubber-coated table tennis paddles, set of 2.', 6, 1, 'Good', 'Indoor Hall', 'Limited'],
  ['Volleyball', 'Volleyball', 'Standard match volleyball, synthetic leather.', 9, 6, 'Good', 'Store Room A', 'Available'],
  ['Javelin (Practice)', 'Athletics', '600g practice javelin, aluminium shaft.', 4, 4, 'Good', 'Athletics Shed', 'Available'],
  ['Shot Put (7.26kg)', 'Athletics', "Competition-grade shot put, men's category.", 3, 3, 'Good', 'Athletics Shed', 'Available'],
  ['Kabaddi Mat', 'Kabaddi', 'Synthetic court mat, 13m x 10m.', 2, 0, 'Under Repair', 'Store Room D', 'Maintenance'],
  ['Yoga Mat', 'Gym', '6mm anti-slip mat for stretching & conditioning.', 25, 19, 'Good', 'Gym Room', 'Available'],
  ['Dumbbell Set (5–15kg)', 'Gym', 'Rubber-coated hex dumbbells, paired set.', 12, 5, 'Good', 'Gym Room', 'Limited'],
  ['Chess Set (Tournament)', 'Chess', 'Wooden staunton set with folding board & clock.', 10, 8, 'New', 'Indoor Hall', 'Available'],
  ['Cricket Stumps (Set)', 'Cricket', 'Full set of stumps, bails & base.', 6, 4, 'Good', 'Store Room B', 'Available'],
  ['Football Cones (Set of 20)', 'Football', 'Agility training cones for drills.', 14, 14, 'New', 'Store Room A', 'Available'],
];

async function seed({ closeConnection = true } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Wipe existing demo data (safe for a fresh dev DB only)
    // pg-mem does not support multi-table TRUNCATE with CASCADE, so clear tables individually.
    await client.query('DELETE FROM Fines');
    await client.query('DELETE FROM Notifications');
    await client.query('DELETE FROM DamageReports');
    await client.query('DELETE FROM Returns');
    await client.query('DELETE FROM Bookings');
    await client.query('DELETE FROM Equipment');
    await client.query('DELETE FROM Users');

    const passwordHash = await bcrypt.hash('password123', 10);

    const users = [
      ['Admin User', 'admin@courtside.edu', 'Admin', 'Sports Office', '9000000001'],
      ['Sports Office Admin', 'sportsadmin@courtside.edu', 'Admin', 'Sports Office', '9000000002'],
      ['Tanu Sharma', 'tanu@courtside.edu', 'Student', 'Computer Engineering', '9000000003'],
      ['Aarav Mehta', 'aarav@courtside.edu', 'Student', 'Mechanical Engineering', '9000000004'],
    ];

    for (const [name, email, role, department, phone] of users) {
      await client.query(
        `INSERT INTO Users (Name, Email, PasswordHash, Role, Department, Phone)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [name, email, passwordHash, role, department, phone]
      );
    }

    for (const [name, sport, description, qty, avail, condition, location, status] of SPORTS_EQUIPMENT) {
      await client.query(
        `INSERT INTO Equipment (Name, Sport, Description, Quantity, AvailableQuantity, Condition, Location, Status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [name, sport, description, qty, avail, condition, location, status]
      );
    }

    await client.query('COMMIT');
    console.log('✔ Seed data inserted.');
    console.log('  Demo login (all users): password123');
    users.forEach(([name, email, role]) => console.log(`   - ${role.padEnd(11)} ${email}`));
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✘ Seeding failed:', err.message);
    process.exitCode = 1;
    return false;
  } finally {
    client.release();
    if (closeConnection) {
      await pool.end();
    }
  }
}

if (require.main === module) {
  seed();
}

module.exports = { seed };
