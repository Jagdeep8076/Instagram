const nodemailer = require('nodemailer');

let transporter = null;

if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Sends an email or logs to console in development
 */
async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || '"Instaclone Support" <no-reply@instaclone.com>';

  if (transporter) {
    try {
      await transporter.sendMail({ from, to, subject, text, html });
      return true;
    } catch (err) {
      console.error('[Mailer Error] Failed to send via SMTP:', err.message);
      // Fallback to console log in dev
    }
  }

  // Development Console Fallback
  console.log('\n================================================================');
  console.log(' [DEV EMAIL DISPATCH]');
  console.log(` To:      ${to}`);
  console.log(` Subject: ${subject}`);
  console.log(` Body:\n${text}`);
  console.log('================================================================\n');
  return true;
}

module.exports = {
  sendMail,
};

