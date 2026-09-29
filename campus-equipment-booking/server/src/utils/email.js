const nodemailer = require('nodemailer');

function isEmailConfigured() {
  const port = Number(process.env.SMTP_PORT || 587);
  return Boolean(
    process.env.SMTP_HOST
      && Number.isInteger(port)
      && process.env.SMTP_USER
      && process.env.SMTP_PASS
      && (process.env.SMTP_FROM || process.env.SMTP_USER)
  );
}

async function sendEmail({ to, subject, text }) {
  if (!isEmailConfigured()) throw new Error('SMTP settings are incomplete.');

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === 'true'
      : port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  });
}

module.exports = { isEmailConfigured, sendEmail };