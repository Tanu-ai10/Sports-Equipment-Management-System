const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { userId: user.userid, name: user.name, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitize(user) {
  return {
    userId: user.userid,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    phone: user.phone,
  };
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, phone } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'name, email, password and role are required.' });
  }
  if (!['Student', 'Coordinator', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be Student, Coordinator or Admin.' });
  }
  try {
    const existing = await db.query('SELECT 1 FROM Users WHERE Email = $1', [email]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO Users (Name, Email, PasswordHash, Role, Department, Phone)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [name, email, passwordHash, role, department || null, phone || null]
    );
    const user = result.rows[0];
    const token = signToken(user);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }
  try {
    const result = await db.query('SELECT * FROM Users WHERE Email = $1', [email]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.passwordhash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/forgot-password
// Demo implementation: generates a reset token and returns it directly instead of emailing it.
// In production, swap the response for an email send (e.g. via SES/SendGrid) and never return
// the token in the API response.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });
  try {
    const result = await db.query('SELECT UserID FROM Users WHERE Email = $1', [email]);
    if (result.rowCount === 0) {
      // Don't reveal whether the email exists.
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }
    const resetToken = jwt.sign({ userId: result.rows[0].userid, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '30m' });
    res.json({
      message: 'If that email is registered, a reset link has been sent.',
      devResetToken: resetToken, // remove this field once real email delivery is wired up
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not process the request.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: 'resetToken and newPassword are required.' });
  }
  try {
    const payload = jwt.verify(resetToken, process.env.JWT_SECRET);
    if (payload.purpose !== 'password-reset') throw new Error('Wrong token type');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE Users SET PasswordHash = $1 WHERE UserID = $2', [passwordHash, payload.userId]);
    res.json({ message: 'Password updated. You can now log in with your new password.' });
  } catch (err) {
    res.status(400).json({ error: 'Reset link is invalid or has expired.' });
  }
});

module.exports = router;
