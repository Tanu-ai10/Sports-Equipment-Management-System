const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { isEmailConfigured, sendEmail } = require('../utils/email');

const router = express.Router();
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isStrongPassword(password) {
  return typeof password === 'string'
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
    && /[^A-Za-z0-9\s]/.test(password);
}

function signToken(user) {
  return jwt.sign(
    { userId: user.userid, name: user.name, email: user.email, role: user.role === 'Coordinator' ? 'Admin' : user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function sanitize(user) {
  return {
    userId: user.userid,
    name: user.name,
    email: user.email,
    role: user.role === 'Coordinator' ? 'Admin' : user.role,
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
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  if (!isStrongPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, a number and a special character.' });
  }
  if (!['Student', 'Admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be Student or Admin.' });
  }
  if (!isEmailConfigured()) {
    return res.status(503).json({ error: 'Email verification is unavailable. Configure SMTP settings and try again.' });
  }
  try {
    const cleanEmail = email.trim();
    const existing = await db.query('SELECT 1 FROM Users WHERE Email = $1', [cleanEmail]);
    if (existing.rowCount > 0) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await db.query(
      `INSERT INTO Users (Name, Email, PasswordHash, Role, Department, Phone, EmailVerified)
       VALUES ($1,$2,$3,$4,$5,$6,FALSE) RETURNING *`,
      [name, cleanEmail, passwordHash, role, department || null, phone || null]
    );
    const user = result.rows[0];
    const verificationToken = jwt.sign(
      { userId: user.userid, purpose: 'email-verification' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    const verificationUrl = new URL(
      '/verify-email',
      process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || 'http://localhost:5173'
    );
    verificationUrl.searchParams.set('token', verificationToken);

    try {
      await sendEmail({
        to: cleanEmail,
        subject: 'Verify your CourtSide account',
        text: `Hello ${name},\n\nVerify your email address to finish creating your CourtSide account:\n${verificationUrl.toString()}\n\nThis link expires in 24 hours.`,
      });
    } catch (emailError) {
      await db.query('DELETE FROM Users WHERE UserID = $1 AND EmailVerified = FALSE', [user.userid]);
      console.error('Verification email delivery failed:', emailError.message);
      return res.status(503).json({ error: 'Could not send a verification email. Check the email address and try again.' });
    }

    res.status(201).json({ message: 'Check your email to verify your address and complete signup.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create account.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required.' });
  }
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  try {
    const result = await db.query('SELECT * FROM Users WHERE Email = $1', [email.trim()]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.passwordhash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }
    if (user.emailverified === false) {
      return res.status(403).json({ error: 'Please verify your email before logging in.' });
    }
    const accountRole = user.role === 'Coordinator' ? 'Admin' : user.role;
    if (role && role !== accountRole) {
      return res.status(403).json({ error: `This account is registered as ${accountRole}. Choose ${accountRole} to log in.` });
    }
    const token = signToken(user);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Verification token is required.' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.purpose !== 'email-verification') throw new Error('Wrong token type');
  } catch {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  }

  try {
    const result = await db.query(
      'SELECT UserID, Name, Email, EmailVerified FROM Users WHERE UserID = $1',
      [payload.userId]
    );
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
    }

    const user = result.rows[0];
    if (user.emailverified) {
      return res.json({ message: 'Your email is already verified. You can log in.' });
    }
    if (!isEmailConfigured()) {
      return res.status(503).json({ error: 'Email delivery is unavailable. Please try again later.' });
    }

    await sendEmail({
      to: user.email,
      subject: 'Your CourtSide signup was successful',
      text: `Hello ${user.name},\n\nYour email is verified and your CourtSide account is ready. You can now log in and book equipment.`,
    });
    await db.query('UPDATE Users SET EmailVerified = TRUE WHERE UserID = $1', [user.userid]);
    res.json({ message: 'Email verified. Your signup is complete, and a confirmation email has been sent.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not verify your email. Please try again.' });
  }
});

// POST /api/auth/forgot-password
// Demo implementation: generates a reset token and returns it directly instead of emailing it.
// In production, swap the response for an email send (e.g. via SES/SendGrid) and never return
// the token in the API response.
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'email is required.' });
  if (typeof email !== 'string' || !EMAIL_PATTERN.test(email.trim())) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }
  try {
    const result = await db.query('SELECT UserID FROM Users WHERE Email = $1', [email.trim()]);
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
  if (!isStrongPassword(newPassword)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters and include uppercase, lowercase, a number and a special character.' });
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
