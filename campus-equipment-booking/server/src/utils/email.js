const nodemailer = require('nodemailer');

const LOCAL_CLIENT_FALLBACK = 'http://localhost:5173';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isEmailConfigured() {
  const port = Number(process.env.SMTP_PORT || 587);
  return Boolean(
    process.env.SMTP_HOST?.trim()
      && Number.isInteger(port)
      && port > 0
      && port <= 65535
      && process.env.SMTP_USER?.trim()
      && process.env.SMTP_PASS?.trim()
  );
}

async function sendEmail({ to, subject, text }) {
  if (!isEmailConfigured()) throw new Error('SMTP settings are incomplete.');

  const port = Number(process.env.SMTP_PORT || 587);
  const smtpHost = process.env.SMTP_HOST.trim();
  const smtpUser = process.env.SMTP_USER.trim();
  const smtpPassword = process.env.SMTP_PASS.trim();
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: {
      user: smtpUser,
      pass: smtpHost === 'smtp.gmail.com' ? smtpPassword.replace(/\s/g, '') : smtpPassword,
    },
  });

  await transporter.sendMail({ from: smtpUser, to, subject, text });
}

function getLocalClientOrigin() {
  if (process.env.NODE_ENV === 'production') return null;

  const configuredOrigin = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN || LOCAL_CLIENT_FALLBACK;
  try {
    const url = new URL(configuredOrigin);
    if (LOCAL_HOSTS.has(url.hostname)) return url.origin;
  } catch {
    return LOCAL_CLIENT_FALLBACK;
  }

  return LOCAL_CLIENT_FALLBACK;
}

function createLocalActionUrl(path, token) {
  const origin = getLocalClientOrigin();
  if (!origin) return null;

  const url = new URL(path, origin);
  url.searchParams.set('token', token);
  return url.toString();
}

module.exports = { createLocalActionUrl, getLocalClientOrigin, isEmailConfigured, sendEmail };