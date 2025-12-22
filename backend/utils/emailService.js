const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || `no-reply@${process.env.SMTP_DOMAIN || 'example.com'}`;

let transporter;
function getTransporter() {
  if (transporter) return transporter;
  // Use SMTP if configured, otherwise try direct send (not recommended)
  if (SMTP_HOST && SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });
  } else {
    // fallback to sendmail if not configured
    transporter = nodemailer.createTransport({ sendmail: true });
  }
  return transporter;
}

async function sendMail({ to, subject, text, html, from }) {
  const t = getTransporter();
  const info = await t.sendMail({
    from: from || FROM_EMAIL,
    to,
    subject,
    text,
    html,
  });

  return info;
}

module.exports = { sendMail };
