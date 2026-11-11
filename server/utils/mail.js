const nodemailer = require('nodemailer');
let transporter;
const configured = () => !!process.env.SMTP_HOST;
const getTransport = () => {
  if (!transporter && configured()) {
    const port = +process.env.SMTP_PORT || 587;
    transporter = nodemailer.createTransport({ host: process.env.SMTP_HOST, port, secure: port === 465, auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
  }
  return transporter;
};
// Called once at startup so you immediately know whether emails can be sent
async function verifyMail() {
  if (!configured()) return console.log('[mail] SMTP is NOT configured -> emails/codes are printed in this terminal (development mode).');
  try { await getTransport().verify(); console.log('[mail] SMTP ready, emails will be sent from', process.env.MAIL_FROM || process.env.SMTP_USER); }
  catch (e) { console.error('[mail] SMTP connection FAILED:', e.message, '\n       Check SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS in server/.env (Gmail needs an App Password).'); }
}
// Returns true when really sent, false when only printed to the console. Throws if SMTP is configured but sending fails.
async function sendMail({ to, subject, text, html }) {
  if (!configured()) { console.log(`\n[DEV EMAIL] To: ${to}\nSubject: ${subject}\n${text}\n`); return false; }
  try { await getTransport().sendMail({ from: process.env.MAIL_FROM || process.env.SMTP_USER, to, subject, text, html }); return true; }
  catch (e) { console.error('[mail] Sending to', to, 'failed:', e.message); throw e; }
}
const wrap = (title, body) => `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px"><h2 style="margin:0 0 12px">${title}</h2>${body}<p style="color:#888;font-size:12px;margin-top:28px">If you didn't request this, you can safely ignore this email.</p></div>`;
const codeMail = (code) => ({ subject: `${code} is your Instagram code`, text: `Your Instagram confirmation code is ${code}. It expires in 10 minutes.`, html: wrap('Confirm your email', `<p>Enter this code to finish creating your account:</p><p style="font-size:32px;letter-spacing:8px;font-weight:700">${code}</p><p>It expires in 10 minutes.</p>`) });
const resetMail = (link) => ({ subject: 'Reset your Instagram password', text: `Reset your password using this link (valid for 1 hour): ${link}`, html: wrap('Reset your password', `<p>Click the button to choose a new password. This link is valid for 1 hour.</p><p><a href="${link}" style="background:#0864da;color:#fff;padding:12px 22px;border-radius:24px;text-decoration:none;display:inline-block">Reset password</a></p><p style="word-break:break-all;color:#555;font-size:12px">${link}</p>`) });
module.exports = { verifyMail, sendMail, codeMail, resetMail };
