'use strict';

const express    = require('express');
const nodemailer = require('nodemailer');
const cors       = require('cors');
const path       = require('path');

// Load .env from the project root (one level up from email-server/)
const envPath = path.resolve(__dirname, '../.env');
require('dotenv').config({ path: envPath });

const app = express();

// Allow any localhost origin (Vite uses random ports sometimes)
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
      cb(null, true);
    } else {
      cb(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json({ limit: '5mb' }));

// ============================================================
// GMAIL CREDENTIALS — set these in your .env file:
//   EMAIL_USER=your_gmail@gmail.com
//   EMAIL_PASS=your_16_char_app_password
// Generate App Password at: https://myaccount.google.com/apppasswords
// ============================================================
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER || !EMAIL_PASS) {
  console.error('');
  console.error('╔══════════════════════════════════════════════════════════════╗');
  console.error('║  ❌  FATAL: EMAIL_USER or EMAIL_PASS not set in .env file   ║');
  console.error('║  → Add these lines to your .env file:                       ║');
  console.error('║     EMAIL_USER=your_gmail@gmail.com                         ║');
  console.error('║     EMAIL_PASS=your_16_char_app_password                    ║');
  console.error('║  → Get App Password: https://myaccount.google.com/apppasswords ║');
  console.error('╚══════════════════════════════════════════════════════════════╝');
  console.error('');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
});

// Verify SMTP connection on startup
transporter.verify((err) => {
  if (err) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════════════╗');
    console.error('║  ❌  SMTP VERIFY FAILED — Emails will NOT be sent       ║');
    console.error(`║  Error: ${String(err.message).substring(0, 52).padEnd(52)}║`);
    console.error('║  Fix: Check EMAIL_USER/EMAIL_PASS in .env               ║');
    console.error('╚══════════════════════════════════════════════════════════╝');
    console.error('');
  } else {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log(`║  ✅  SMTP verified — Sending as: ${EMAIL_USER.padEnd(24)}║`);
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
  }
});

// ── Health Check ───────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', user: EMAIL_USER });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', user: EMAIL_USER, ts: new Date().toISOString() });
});

// ── Email Templates ────────────────────────────────────────────────────────
function getTemplate(type, data) {
  const { name = 'Student', studentId = '', department = 'General', tutor = 'N/A', time = '', date = '', exitReason = '' } = data;

  const footer = `
    <div style="background:#0f172a;padding:18px;text-align:center;">
      <p style="color:rgba(255,255,255,0.35);font-size:11px;margin:0;text-transform:uppercase;letter-spacing:2px;">
        Smart Attendance System — Automated Notification
      </p>
    </div>`;

  const card = (rows) => `
    <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.07);">
      <tr style="background:#f1f5f9;">
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Detail</td>
        <td style="padding:10px 16px;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;">Value</td>
      </tr>
      ${rows}
    </table>`;

  const row = (label, value, alt = false) =>
    `<tr${alt ? ' style="background:#f8fafc;"' : ''}>
      <td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #f1f5f9;">${label}</td>
      <td style="padding:12px 16px;color:#0f172a;font-weight:700;font-size:13px;">${value}</td>
    </tr>`;

  const templates = {

    // ── Registration ────────────────────────────────────────────────────────
    registered: {
      subject: '✅ Registration Successful — Smart Attendance System',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          <div style="background:linear-gradient(135deg,#2563eb,#1e40af);padding:40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:900;letter-spacing:-1px;">Smart Attendance System</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Registration Confirmed</p>
          </div>
          <div style="padding:40px;background:#f8fafc;">
            <div style="background:#eef2ff;border-left:4px solid #2563eb;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#1e40af;">🎉 Welcome to the System, ${name}!</p>
              <p style="margin:6px 0 0;color:#3730a3;font-size:14px;">Your biometric identity has been registered successfully.</p>
            </div>
            ${card(
              row('Student Name', name) +
              row('Student ID', `<span style="font-family:monospace;">${studentId}</span>`, true) +
              row('Department', department) +
              row('Tutor', tutor, true) +
              row('Registered On', `${date} at ${time}`)
            )}
            <p style="margin:28px 0 0;color:#64748b;font-size:13px;text-align:center;">
              You can now use face recognition to mark your attendance.
            </p>
          </div>
          ${footer}
        </div>`,
    },

    // ── Check-In ────────────────────────────────────────────────────────────
    checkin: {
      subject: '🟢 Check-In Confirmed — You are Present',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          <div style="background:linear-gradient(135deg,#059669,#047857);padding:40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:900;">Smart Attendance System</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">✅ Check-In Recorded</p>
          </div>
          <div style="padding:40px;background:#f8fafc;">
            <div style="background:#ecfdf5;border-left:4px solid #059669;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#065f46;">Good Day, ${name}!</p>
              <p style="margin:6px 0 0;color:#047857;font-size:14px;">Your attendance has been marked as <strong>PRESENT</strong>.</p>
            </div>
            ${card(
              row('Student', `${name} (${studentId})`) +
              row('Status', '<span style="color:#059669;font-weight:800;">🟢 PRESENT — IN CAMPUS</span>', true) +
              row('Department', department) +
              row('Check-In Time', time, true) +
              row('Date', date)
            )}
          </div>
          ${footer}
        </div>`,
    },

    // ── Check-Out ───────────────────────────────────────────────────────────
    checkout: {
      subject: '🔴 Check-Out Recorded — You have Left Campus',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          <div style="background:linear-gradient(135deg,#dc2626,#b91c1c);padding:40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:900;">Smart Attendance System</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">🚪 Check-Out Recorded</p>
          </div>
          <div style="padding:40px;background:#f8fafc;">
            <div style="background:#fef2f2;border-left:4px solid #dc2626;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#7f1d1d;">Goodbye, ${name}!</p>
              <p style="margin:6px 0 0;color:#991b1b;font-size:14px;">Your exit from campus has been recorded.</p>
            </div>
            ${card(
              row('Student', `${name} (${studentId})`) +
              row('Status', '<span style="color:#dc2626;font-weight:800;">🔴 OUT — LEFT CAMPUS</span>', true) +
              row('Department', department) +
              row('Check-Out Time', time, true) +
              row('Date', date) +
              (exitReason ? row('Exit Reason', exitReason, true) : '')
            )}
          </div>
          ${footer}
        </div>`,
    },

    // ── Absent ──────────────────────────────────────────────────────────────
    absent: {
      subject: '⚠️ Absence Alert — You were Marked Absent Today',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          <div style="background:linear-gradient(135deg,#d97706,#b45309);padding:40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:900;">Smart Attendance System</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">⚠️ Absence Notification</p>
          </div>
          <div style="padding:40px;background:#f8fafc;">
            <div style="background:#fffbeb;border-left:4px solid #d97706;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#78350f;">Dear ${name},</p>
              <p style="margin:6px 0 0;color:#92400e;font-size:14px;">You have been marked <strong>ABSENT</strong> for today's session.</p>
            </div>
            ${card(
              row('Student', `${name} (${studentId})`) +
              row('Status', '<span style="color:#d97706;font-weight:800;">⚠️ ABSENT</span>', true) +
              row('Department', department) +
              row('Date', date, true)
            )}
            <p style="margin:28px 0 0;color:#64748b;font-size:13px;text-align:center;">
              Please contact your tutor or administration if this is an error.
            </p>
          </div>
          ${footer}
        </div>`,
    },

    // ── Security Alert ──────────────────────────────────────────────────────
    security: {
      subject: '🔐 Security Alert — Login Detected',
      html: `
        <div style="font-family:'Segoe UI',sans-serif;max-width:600px;margin:auto;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.12);">
          <div style="background:linear-gradient(135deg,#7c3aed,#5b21b6);padding:40px;text-align:center;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:900;">Smart Attendance System</h1>
            <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:12px;text-transform:uppercase;letter-spacing:2px;">🔐 Login Notification</p>
          </div>
          <div style="padding:40px;background:#f8fafc;">
            <div style="background:#f5f3ff;border-left:4px solid #7c3aed;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:16px;font-weight:700;color:#4c1d95;">Hello, ${name}!</p>
              <p style="margin:6px 0 0;color:#5b21b6;font-size:14px;">A login to your account was just detected.</p>
            </div>
            ${card(
              row('Student', `${name} (${studentId})`) +
              row('Login Time', time, true) +
              row('Date', date)
            )}
            <p style="margin:28px 0 0;color:#64748b;font-size:13px;text-align:center;">
              If this was not you, please contact administration immediately.
            </p>
          </div>
          ${footer}
        </div>`,
    },
  };

  return templates[type] || null;
}

// ── Send Email Route ───────────────────────────────────────────────────────
app.post('/send-email', async (req, res) => {
  const { to, type, data } = req.body;

  if (!to || !type || !data) {
    return res.status(400).json({ success: false, error: 'Missing required fields: to, type, data' });
  }

  // Inject timestamp defaults if not supplied
  const now = new Date();
  const enrichedData = {
    ...data,
    time: data.time || now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    date: data.date || now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
  };

  const template = getTemplate(type, enrichedData);
  if (!template) {
    return res.status(400).json({ success: false, error: `Unknown email type: "${type}". Valid types: registered, checkin, checkout, absent, security` });
  }

  try {
    const info = await transporter.sendMail({
      from: `"Smart Attendance System" <${EMAIL_USER}>`,
      to,
      subject: template.subject,
      html: template.html,
    });

    console.log(`✅ [${type.toUpperCase()}] Email sent → ${to}  (id: ${info.messageId})`);
    res.json({ success: true, messageId: info.messageId });

  } catch (err) {
    console.error(`❌ [${type.toUpperCase()}] Failed to send to ${to}:`, err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.EMAIL_SERVER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`📧 Email server  →  http://localhost:${PORT}`);
  console.log(`   Loaded .env   →  ${envPath}`);
});
