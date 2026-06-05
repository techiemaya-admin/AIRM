/**
 * Send background verification document upload link email
 */
export async function sendVerificationMailEmail({ to, candidateName, verificationType, verificationName, uploadLink }) {
  try {
    if (!resend) {
      console.log('⚠️ Resend not configured, skipping verification mail');
      return { success: false, fallback: true };
    }
    const subject = `Document Upload Request: ${verificationName}`;
    const html = `
      <div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
        <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
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
            <a href="${uploadLink}" style="background:#667eea;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Upload Documents</a>
          </div>
          <p style="color:#888;font-size:14px;">If you have any questions, reply to this email.</p>
        </div>
      </div>
    `;
    const text = `Hi ${candidateName},\n\nPlease upload your documents for verification (${verificationType}: ${verificationName}).\nUpload link: ${uploadLink}`;
    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html,
      text,
    });
    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }
    console.log('📧 Verification mail sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send verification mail:', error);
    throw new Error('Failed to send verification mail');
  }
}
/**
 * Send interview round notification email
 */
export async function sendInterviewRoundEmail({ to, candidateName, roundName, interviewerName, interviewerEmail, interviewDate }) {
  try {
    if (!resend) {
      console.log('⚠️ Resend not configured, skipping interview round email');
      return { success: false, fallback: true };
    }
    const subject = `Interview Scheduled: ${roundName}`;
    const html = `<div style="max-width:600px;margin:0 auto;font-family:Arial,sans-serif;">
      <div style="background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:24px;text-align:center;border-radius:10px 10px 0 0;">
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
        <p style="color:#666;font-size:15px;">Please be prepared and reach out if you have any questions.</p>
      </div>
    </div>`;
    const text = `Hi ${candidateName},\n\nYour interview round has been scheduled.\n\nRound: ${roundName}\nInterviewer: ${interviewerName}\nDate & Time: ${interviewDate ? new Date(interviewDate).toLocaleString() : 'TBD'}\n\nPlease be prepared and reach out if you have any questions.`;

    // Generate ICS calendar invite
    let icsAttachment = null;
    if (interviewDate) {
      const start = new Date(interviewDate);
      const end = new Date(start.getTime() + 60 * 60 * 1000); // 1 hour duration
      const dtStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtStart = start.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const dtEnd = end.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const uid = `interview-${start.getTime()}@techiemaya.com`;
      const organizerName = 'TechieMaya HR';
      const organizerEmail = 'noreply@pulse.techiemaya.com';
      const candidateEmail = to;
      // interviewerEmail may be undefined, fallback to default if needed in ICS
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
        `ORGANIZER;CN=${organizerName}:MAILTO:${organizerEmail}`,
        `ATTENDEE;CN=Candidate;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${candidateEmail}`,
        `ATTENDEE;CN=Interviewer;ROLE=REQ-PARTICIPANT;RSVP=TRUE:MAILTO:${interviewerEmail || 'interviewer@techiemaya.com'}`,
        'SEQUENCE:0',
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');
      icsAttachment = {
        filename: 'interview.ics',
        content: Buffer.from(icsContent).toString('base64'),
        type: 'text/calendar',
      };
    }

    const emailOptions = {
      from: EMAIL_CONFIG.from,
      to: [to],
      replyTo: EMAIL_CONFIG.replyTo,
      subject,
      html,
      text,
      attachments: icsAttachment ? [icsAttachment] : [],
    };
    const { data, error } = await resend.emails.send(emailOptions);
    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }
    console.log('📧 Interview round email sent:', data.id);
    return { success: true, messageId: data.id };
  } catch (error) {
    console.error('❌ Failed to send interview round email:', error);
    throw new Error('Failed to send interview round email');
  }
}
/**
 * Email Service
 * Handles sending emails using Resend API
 */

import { Resend } from 'resend';

// Initialize Resend client only if API key is available
let resend = null;
const resendApiKey = process.env.RESEND_API_KEY;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
  console.log('✅ Resend email service initialized');
} else {
  console.log('⚠️  Resend API key not configured, email service will use fallback mode');
}

// Email configuration
const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || 'VCP <noreply@techiemaya.com>',
  replyTo: process.env.EMAIL_REPLY_TO || 'support@techiemaya.com'
};

/**
 * Send magic link email using Resend
 */
export async function sendMagicLinkEmail(email, magicLink, userName = null) {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.log('⚠️ Resend not configured, using fallback mode');
      return { success: false, fallback: true, magicLink };
    }

    console.log('📧 Sending magic link email via Resend to:', email);

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '🔗 Your Magic Link - TechieMaya VCP',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🔗 Magic Link Login</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName || 'there'}! 👋</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              You requested a magic link to sign in to your TechieMaya VCP account. 
              Click the button below to access your account securely.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${magicLink}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🚀 Sign In to VCP
              </a>
            </div>
            
            <p style="color: #888; font-size: 14px; margin: 20px 0;">
              <strong>⏰ This link expires in 15 minutes</strong> for your security.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 5px; padding: 15px; margin: 20px 0;">
              <p style="color: #856404; margin: 0; font-size: 14px;">
                🔒 <strong>Security Notice:</strong> If you didn't request this login link, 
                please ignore this email. Never share this link with anyone.
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              This email was sent to ${email} from TechieMaya VCP System.<br>
              If you're having trouble with the button above, copy and paste this URL into your browser:<br>
              <span style="word-break: break-all;">${magicLink}</span>
            </p>
          </div>
        </div>
      `,
      text: `
Hi ${userName || 'there'}!

You requested a magic link to sign in to your TechieMaya VCP account.

Click this link to sign in: ${magicLink}

This link expires in 15 minutes for your security.

If you didn't request this login link, please ignore this email.

---
TechieMaya VCP System
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log('📧 Magic link email sent successfully via Resend:', data.id);
    return { success: true, messageId: data.id };

  } catch (error) {
    console.error('❌ Failed to send magic link email via Resend:', error);
    throw new Error('Failed to send email via Resend');
  }
}

/**
 * Send welcome email for new users using Resend
 */
export async function sendWelcomeEmail(email, userName) {
  try {
    // Check if Resend is configured
    if (!resend) {
      console.log('⚠️ Resend not configured, skipping welcome email');
      return { success: false, fallback: true };
    }

    console.log('📧 Sending welcome email via Resend to:', email);

    const { data, error } = await resend.emails.send({
      from: EMAIL_CONFIG.from,
      to: [email],
      replyTo: EMAIL_CONFIG.replyTo,
      subject: '🎉 Welcome to TechieMaya VCP!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🎉 Welcome to VCP!</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hi ${userName}! 👋</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.5;">
              Welcome to TechieMaya VCP (Version Control Portal)! Your account has been set up successfully.
            </p>
            
            <div style="background: #d4edda; border: 1px solid #c3e6cb; border-radius: 5px; padding: 20px; margin: 20px 0;">
              <h3 style="color: #155724; margin-top: 0;">🚀 What you can do:</h3>
              <ul style="color: #155724; margin: 0;">
                <li>⏱️ Track your time with our time clock system</li>
                <li>📊 Manage timesheets and view reports</li>
                <li>🎫 Create and track issues from GitLab</li>
                <li>🏖️ Request and manage leave</li>
                <li>👥 Collaborate with your team</li>
              </ul>
            </div>
            
            <p style="color: #666; font-size: 16px;">
              To access your account, simply use the magic link authentication - 
              no passwords needed! Just enter your email address and we'll send you a secure login link.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_BASE_URL || ''}" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 25px; 
                        font-size: 16px; 
                        font-weight: bold;
                        display: inline-block;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);">
                🚀 Access VCP Portal
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              Need help? Contact your administrator or reach out to the TechieMaya team.
            </p>
          </div>
        </div>
      `,
      text: `
Hi ${userName}!

Welcome to TechieMaya VCP (Version Control Portal)! Your account has been set up successfully.

What you can do:
- Track your time with our time clock system
- Manage timesheets and view reports  
- Create and track issues from GitLab
- Request and manage leave
- Collaborate with your team

To access your account, simply use the magic link authentication - no passwords needed!
Just enter your email address and we'll send you a secure login link.

Access VCP Portal: ${process.env.APP_BASE_URL || ''}

Need help? Contact your administrator or reach out to the TechieMaya team.
      `
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Resend API error: ${error.message}`);
    }

    console.log('📧 Welcome email sent successfully via Resend:', data.id);
    return { success: true, messageId: data.id };

  } catch (error) {
    console.error('❌ Failed to send welcome email via Resend:', error);
    throw new Error('Failed to send welcome email via Resend');
  }
}

