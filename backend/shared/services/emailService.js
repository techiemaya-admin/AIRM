/**
 * Email Service
 * Optional SMTP via nodemailer. Auth login uses email + password (no Resend / magic-link provider).
 */

import nodemailer from 'nodemailer';

const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'noreply@techiemaya.com',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@techiemaya.com',
};

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });

  return transporter;
}

async function sendMail({ to, subject, html, text, attachments }) {
  const tx = getTransporter();
  if (!tx) {
    console.log('⚠️ SMTP not configured, skipping email:', subject);
    return { success: false, fallback: true };
  }

  const info = await tx.sendMail({
    from: EMAIL_CONFIG.from,
    to: Array.isArray(to) ? to.join(', ') : to,
    replyTo: EMAIL_CONFIG.replyTo,
    subject,
    html,
    text,
    attachments,
  });

  return { success: true, messageId: info.messageId };
}

/**
 * Send background verification document upload link email
 */
export async function sendVerificationMailEmail({
  to,
  candidateName,
  verificationType,
  verificationName,
  uploadLink,
}) {
  try {
    const subject = `Document Upload Request: ${verificationName}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:#1e3a8a;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
          <h1 style="color:white;margin:0;font-size:24px;">Document Upload Request</h1>
        </div>
        <div style="background:#f8f9fa;padding:24px;border-radius:0 0 10px 10px;">
          <h2 style="color:#333;margin-top:0;">Hi ${candidateName},</h2>
          <p style="color:#666;font-size:16px;">Please upload your documents for the following verification:</p>
          <ul style="color:#333;font-size:16px;">
            <li><strong>Verification Type:</strong> ${verificationType}</li>
            <li><strong>Verification Name:</strong> ${verificationName}</li>
          </ul>
          <div style="margin:24px 0;text-align:center;">
            <a href="${uploadLink}" style="background:#1e3a8a;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Upload Documents</a>
          </div>
        </div>
      </div>
    `;
    const text = `Hi ${candidateName},\n\nPlease upload your documents for verification (${verificationType}: ${verificationName}).\nUpload link: ${uploadLink}`;
    return await sendMail({ to, subject, html, text });
  } catch (error) {
    console.error('❌ Failed to send verification mail:', error);
    throw new Error('Failed to send verification mail');
  }
}

/**
 * Send interview round notification email
 */
export async function sendInterviewRoundEmail({
  to,
  candidateName,
  roundName,
  interviewerName,
  interviewerEmail,
  interviewDate,
}) {
  try {
    const subject = `Interview Scheduled: ${roundName}`;
    const html = `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:#1e3a8a;padding:24px;text-align:center;border-radius:10px 10px 0 0;">
        <h1 style="color:white;margin:0;font-size:24px;">Interview Round Scheduled</h1>
      </div>
      <div style="background:#f8f9fa;padding:24px;border-radius:0 0 10px 10px;">
        <h2 style="color:#333;margin-top:0;">Hi ${candidateName},</h2>
        <p style="color:#666;font-size:16px;">Your interview round has been scheduled with the following details:</p>
        <ul style="color:#333;font-size:16px;">
          <li><strong>Round:</strong> ${roundName}</li>
          <li><strong>Interviewer:</strong> ${interviewerName}</li>
          <li><strong>Date & Time:</strong> ${interviewDate ? new Date(interviewDate).toLocaleString() : 'TBD'}</li>
        </ul>
      </div>
    </div>`;
    const text = `Hi ${candidateName},\n\nYour interview round has been scheduled.\n\nRound: ${roundName}\nInterviewer: ${interviewerName}\nDate & Time: ${interviewDate ? new Date(interviewDate).toLocaleString() : 'TBD'}`;

    let attachments;
    if (interviewDate) {
      const start = new Date(interviewDate);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `interview-${start.getTime()}@techiemaya.com`;
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//TechieMaya//Interview Scheduler//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:REQUEST',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${dtStamp}`,
        `DTSTART:${dtStart}`,
        `DTEND:${dtEnd}`,
        'SUMMARY:Technical Interview – TechieMaya',
        `DESCRIPTION:Interview Round: ${roundName}\\nInterviewer: ${interviewerName}`,
        'LOCATION:Online',
        'ORGANIZER;CN=TechieMaya HR:MAILTO:noreply@techiemaya.com',
        `ATTENDEE;CN=Candidate;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${to}`,
        `ATTENDEE;CN=Interviewer;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${interviewerEmail || 'interviewer@techiemaya.com'}`,
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');
      attachments = [
        {
          filename: 'interview.ics',
          content: Buffer.from(icsContent),
          contentType: 'text/calendar',
        },
      ];
    }

    return await sendMail({ to, subject, html, text, attachments });
  } catch (error) {
    console.error('❌ Failed to send interview round email:', error);
    throw new Error('Failed to send interview round email');
  }
}

/**
 * Legacy magic-link helper (unused for login — kept for API compatibility).
 * Login uses email + password. Returns fallback without sending.
 */
export async function sendMagicLinkEmail(email, magicLink) {
  console.log('ℹ️ Magic-link email skipped (password auth only). Recipient:', email);
  return { success: false, fallback: true, magicLink };
}

/**
 * Welcome email (optional SMTP)
 */
export async function sendWelcomeEmail(email, userName) {
  try {
    const subject = 'Welcome to TechieMaya';
    const html = `<p>Hi ${userName || 'there'},</p><p>Your account is ready. Sign in with your email and password.</p>`;
    const text = `Hi ${userName || 'there'},\n\nYour account is ready. Sign in with your email and password.`;
    return await sendMail({ to: email, subject, html, text });
  } catch (error) {
    console.error('❌ Failed to send welcome email:', error);
    return { success: false, fallback: true };
  }
}
