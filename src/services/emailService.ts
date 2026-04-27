// ============================================================
// Nodemailer Email Service (via local Express server)
// The email server is started automatically when you run:
//   npm run start          ← runs BOTH Vite + email server
//
// Or start manually:
//   node email-server/server.cjs
// ============================================================

const EMAIL_SERVER = 'http://localhost:3001';

// ── Types ─────────────────────────────────────────────────────────────────
interface EmailData {
  name: string;
  studentId: string;
  department?: string;
  tutor?: string;
  time?: string;
  date?: string;
  exitReason?: string;
}

// ── Server Health Check ────────────────────────────────────────────────────
let _serverStatusCached: boolean | null = null;

export async function isEmailServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${EMAIL_SERVER}/health`, { signal: AbortSignal.timeout(2000) });
    _serverStatusCached = res.ok;
    return res.ok;
  } catch {
    _serverStatusCached = false;
    return false;
  }lll
}

// ── Core Sender ────────────────────────────────────────────────────────────
async function sendEmail(
  to: string,
  type: 'registered' | 'checkin' | 'checkout' | 'absent' | 'security',
  data: EmailData
): Promise<boolean> {
  // Guard: skip if no email address
  if (!to || !to.trim()) {
    console.warn(`[EMAIL] Skipped "${type}" — no email address provided.`);
    return false;
  }

  const now = new Date();
  const payload = {
    to: to.trim(),
    type,
    data: {
      ...data,
      time: data.time ?? now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
      date: data.date ?? now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }),
    },
  };

  console.group(`📧 [EMAIL] Sending "${type}" to ${to}`);
  console.log('Payload:', payload);

  try {
    const res = await fetch(`${EMAIL_SERVER}/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    const result = await res.json();

    if (result.success) {
      console.log(`✅ Email delivered! MessageId: ${result.messageId}`);
      console.groupEnd();
      _serverStatusCached = true;
      return true;
    } else {
      console.error('❌ Server rejected email:', result.error);
      console.groupEnd();
      return false;
    }
  } catch (err: any) {
    _serverStatusCached = false;
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      console.error('❌ Email server timed out. Is it running? → npm run start');
    } else {
      console.error('❌ Cannot reach email server. Run: npm run start', err?.message);
    }
    console.groupEnd();
    return false;
  }
}

// ── Named Exports ──────────────────────────────────────────────────────────

/** Sent after a student/admin successfully registers */
export const sendRegistrationEmail = (
  email: string,
  name: string,
  studentId: string,
  department?: string,
  tutor?: string
) => sendEmail(email, 'registered', { name, studentId, department, tutor });

/** Sent when a student successfully checks in (first scan) */
export const sendCheckInEmail = (
  email: string,
  name: string,
  studentId: string,
  department?: string
) => sendEmail(email, 'checkin', { name, studentId, department });

/** Sent when a student checks out (second scan + voice reason) */
export const sendCheckOutEmail = (
  email: string,
  name: string,
  studentId: string,
  department?: string,
  exitReason?: string
) => sendEmail(email, 'checkout', { name, studentId, department, exitReason });

/** Sent when a student is manually marked absent (from staff dashboard) */
export const sendAbsentEmail = (
  email: string,
  name: string,
  studentId: string,
  department?: string
) => sendEmail(email, 'absent', { name, studentId, department });

/** Sent when a student/staff logs in via the portal */
export const sendSecurityAlertEmail = (
  email: string,
  name: string,
  studentId: string
) => sendEmail(email, 'security', { name, studentId });

// ── Legacy compatibility ───────────────────────────────────────────────────
export const sendAttendanceEmail = (
  email: string,
  name: string,
  type: 'check-in' | 'check-out',
  department?: string
) =>
  type === 'check-in'
    ? sendEmail(email, 'checkin', { name, studentId: '', department })
    : sendEmail(email, 'checkout', { name, studentId: '', department });
