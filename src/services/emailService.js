import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_APP_PASSWORD = process.env.EMAIL_APP_PASSWORD;

let transporterInstance = null;

function getTransporter() {
  if (!EMAIL_USER || !EMAIL_APP_PASSWORD) {
    throw new Error('Email sending is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in environment variables (a Gmail address and an App Password).');
  }
  if (!transporterInstance) {
    transporterInstance = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: EMAIL_USER, pass: EMAIL_APP_PASSWORD },
    });
  }
  return transporterInstance;
}

/**
 * Sends a real email through the recruiter's own connected Gmail account.
 * No fallback: if credentials are missing or sending fails, this throws a
 * real error, the caller must surface that honestly rather than pretending
 * the email went out.
 */
export async function sendEmail({ to, subject, text }) {
  if (!to || !to.trim()) {
    throw new Error('Recipient email address is required.');
  }
  const transporter = getTransporter();
  const info = await transporter.sendMail({
    from: `"TalentProof Recruiting" <${EMAIL_USER}>`,
    to,
    subject,
    text,
  });
  return { messageId: info.messageId };
}

export function isEmailConfigured() {
  return !!(EMAIL_USER && EMAIL_APP_PASSWORD);
}

// Gmail's "+" addressing delivers you+anything@gmail.com straight to the
// normal inbox, so each job posting gets its own tagged apply address for
// free, with no separate mailbox. The Apps Script watcher reads the job ID
// back out of the "To" header, which is what tells it which job posting an
// emailed resume belongs to, deterministically, not by guessing from the
// email's content.
export function getApplyEmailAddress(jobPostingId) {
  if (!EMAIL_USER || !EMAIL_USER.includes('@')) return null;
  const [local, domain] = EMAIL_USER.split('@');
  return `${local}+${jobPostingId}@${domain}`;
}
