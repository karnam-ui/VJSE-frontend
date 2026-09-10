require('dotenv').config();
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// Email 1 — Sent to SOURCER when founder requests intro
// Sourcer must respond before mentor is contacted
async function sendSourcerIntroRequestEmail({
  sourcerEmail,
  sourcerName,
  founderName,
  startupName,
  mentorName,
  sourcerInviteToken,
  connectionId
}) {
  const yesLink = `${APP_BASE_URL}/api/invite/sourcer-respond?token=${sourcerInviteToken}&response=yes&connectionId=${connectionId}`;
  const noLink = `${APP_BASE_URL}/api/invite/sourcer-respond?token=${sourcerInviteToken}&response=no&connectionId=${connectionId}`;

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: sourcerEmail,
    subject: `Action Required — ${founderName} wants to connect with ${mentorName} through you`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${sourcerName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          A founder from VJ College has expressed interest in connecting with 
          <strong>${mentorName}</strong>, whose contact details you shared with the 
          VJ Startups platform.
        </p>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Founder:</strong> ${founderName}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Startup:</strong> ${startupName}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Your Contact:</strong> ${mentorName}</p>
        </div>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Before we reach out to ${mentorName}, we need your confirmation. 
          Are you comfortable making this introduction?
        </p>

        <p style="font-size: 14px; color: #374151; line-height: 1.7;">
          If you click <strong>Yes</strong>, we will send a formal introduction request 
          to ${mentorName} on your behalf — with your name as the introducer.
          <br />
          If you click <strong>No</strong>, the process stops here and our volunteer 
          team will follow up with you directly.
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${yesLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; margin-right: 16px;">
            Yes, I will introduce them
          </a>
          <a href="${noLink}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; border: 1px solid #d1d5db;">
            No, I cannot help right now
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This message was sent by VJ Startups because you submitted a contact to our platform. 
          If you have any concerns please reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Sourcer intro request email sent to: ${sourcerEmail}`);
}

// Email 2 — Sent to MENTOR after sourcer says yes
// Sourcer name is prominent as the introducer
async function sendLeadInviteEmail({
  leadEmail,
  leadName,
  founderName,
  startupName,
  sourcerName,
  inviteToken,
  connectionId
}) {
  const yesLink = `${APP_BASE_URL}/api/invite/respond?token=${inviteToken}&response=yes&connectionId=${connectionId}`;
  const noLink = `${APP_BASE_URL}/api/invite/respond?token=${inviteToken}&response=no&connectionId=${connectionId}`;

  const mailOptions = {
    from: `"${sourcerName} via VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `${sourcerName} would like to introduce you to ${founderName} from ${startupName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${leadName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          <strong>${sourcerName}</strong>, who is known to you, would like to introduce you to 
          <strong>${founderName}</strong>, the founder of <strong>${startupName}</strong> — 
          a student startup from VJ College.
        </p>

        <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Introduced by:</strong> ${sourcerName}</p>
          <p style="margin: 0 0 8px 0; font-size: 14px; color: #374151;"><strong>Founder:</strong> ${founderName}</p>
          <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Startup:</strong> ${startupName}</p>
        </div>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          They are looking for guidance, feedback, or a short conversation with someone 
          experienced in your domain. ${sourcerName} believed you would be the right person 
          to speak with.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Would you be open to a short conversation or product demo with this student startup?
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${yesLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold; margin-right: 16px;">
            Yes, I am open
          </a>
          <a href="${noLink}" style="display: inline-block; background-color: #ffffff; color: #374151; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; border: 1px solid #d1d5db;">
            No, thank you
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
          This introduction was facilitated by VJ Startups, the student startup support 
          ecosystem at VJ College. If you have any concerns please reply to this email.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Mentor invite email sent to: ${leadEmail}`);
}

// Email 3 — Sent to SOURCER notifying them their intro request was sent to mentor
async function sendSourcerNotificationEmail({
  sourcerEmail,
  sourcerName,
  leadName,
  founderName
}) {
  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: sourcerEmail,
    subject: `Update — We have reached out to ${leadName} on your behalf`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${sourcerName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Thank you for agreeing to make the introduction. We have now sent a formal 
          introduction request to <strong>${leadName}</strong> on your behalf.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          ${leadName} has been informed that you are introducing them to 
          <strong>${founderName}</strong>. We will notify you once they respond.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          If ${leadName} agrees, the VJ Startups team will coordinate the next steps 
          and keep you informed throughout.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Sourcer notification email sent to: ${sourcerEmail}`);
}

// Email 4 — Sent to MENTOR after they click Yes I am open
// Confirms the connection and gives them next steps
async function sendWelcomeEmail({
  leadEmail,
  leadName,
  founderName,
  startupName,
  sourcerName
}) {
  const signupLink = APP_BASE_URL;

  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: leadEmail,
    subject: `Welcome — You are now connected with ${founderName} from ${startupName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${leadName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          Thank you for agreeing to connect. We are delighted to welcome you to the 
          VJ Startups ecosystem.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          <strong>${sourcerName}</strong> will personally reach out to you shortly 
          to facilitate the introduction with <strong>${founderName}</strong> from 
          <strong>${startupName}</strong>.
        </p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          The introduction will happen through ${sourcerName} who knows you personally 
          and will coordinate the best way to connect both parties.
        </p>

        <div style="margin: 32px 0; text-align: center;">
          <a href="${signupLink}" style="display: inline-block; background-color: #1D9E75; color: white; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-size: 15px; font-weight: bold;">
            Visit VJ Startups Platform
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Welcome email sent to mentor: ${leadEmail}`);
}

async function sendVolunteerNotificationEmail({
  staffEmail,
  staffName,
  staffRole,
  founderName,
  startupName,
  mentorName,
  mentorDomain,
  sourcerName,
  sourcerEmail,
  sourcerPhone,
  sourcerYear,
  sourcerBranch
}) {
  const mailOptions = {
    from: `"VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: staffEmail,
    subject: `[${staffRole} Alert] ${founderName} has requested an intro for ${mentorName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 32px; border: 1px solid #e5e7eb; border-radius: 8px;">
        <h2 style="color: #111827; font-size: 22px; margin-bottom: 4px;">VJ Startups</h2>
        <p style="color: #6B7280; font-size: 13px; margin-top: 0;">Startup Support Ecosystem — VJ College</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

        <p style="font-size: 15px; color: #111827;">Dear ${staffName},</p>

        <p style="font-size: 15px; color: #374151; line-height: 1.7;">
          A new introduction request has been made on the VJ Startups platform.
          Here are the full details for your records:
        </p>

        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #1E40AF; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Startup Details</p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #1E3A5F;"><strong>Founder:</strong> ${founderName}</p>
          <p style="margin: 0; font-size: 14px; color: #1E3A5F;"><strong>Startup:</strong> ${startupName}</p>
        </div>

        <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #166534; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Mentor Details</p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #14532D;"><strong>Mentor Name:</strong> ${mentorName}</p>
          <p style="margin: 0; font-size: 14px; color: #14532D;"><strong>Domain:</strong> ${mentorDomain}</p>
        </div>

        <div style="background: #FFF7ED; border: 1px solid #FED7AA; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 6px 0; font-size: 13px; color: #9A3412; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;">Sourcer Details — Student Who Provided This Contact</p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #7C2D12;"><strong>Name:</strong> ${sourcerName}</p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #7C2D12;"><strong>Email:</strong> <a href="mailto:${sourcerEmail}" style="color: #EA580C;">${sourcerEmail}</a></p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #7C2D12;"><strong>Phone:</strong> <a href="tel:${sourcerPhone}" style="color: #EA580C;">${sourcerPhone}</a></p>
          <p style="margin: 0 0 4px 0; font-size: 14px; color: #7C2D12;"><strong>Year:</strong> ${sourcerYear}</p>
          <p style="margin: 0; font-size: 14px; color: #7C2D12;"><strong>Branch:</strong> ${sourcerBranch}</p>
        </div>

        <p style="font-size: 14px; color: #374151; line-height: 1.7;">
          The sourcer has been contacted first and must confirm before the mentor is approached.
          You may contact the sourcer directly using the details above if you need to verify
          anything or follow up.
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9CA3AF;">
          VJ Startups — Startup Support Ecosystem, VJ College.
          This notification was sent to all ${staffRole}s automatically.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Volunteer/Admin notification sent to: ${staffEmail}`);
}

async function sendMentorLoginInviteEmail({
  mentorEmail,
  mentorName,
  founderName,
  startupName,
  sourcerName,
  domain
}) {
  const loginLink = `${process.env.APP_BASE_URL || 'http://localhost:5173'}`;

  const mailOptions = {
    from: `"${sourcerName} via VJ Startups" <${process.env.EMAIL_FROM}>`,
    to: mentorEmail,
    subject: `${sourcerName} would like to introduce you to ${founderName} from ${startupName}`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 620px; margin: 0 auto; padding: 0; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb;">

        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #1D9E75 100%); padding: 40px 32px; text-align: center;">
          <h1 style="color: white; font-size: 28px; margin: 0 0 8px 0; font-weight: bold;">VJ Startups</h1>
          <p style="color: #94A3B8; font-size: 14px; margin: 0;">Startup Support Ecosystem — VJ College</p>
        </div>

        <div style="padding: 32px;">
          <p style="font-size: 16px; color: #111827; margin-bottom: 4px;">Dear ${mentorName},</p>

          <p style="font-size: 15px; color: #374151; line-height: 1.8; margin-top: 16px;">
            <strong>${sourcerName}</strong>, who knows you personally, would like to introduce
            you to <strong>${founderName}</strong>, the founder of
            <strong>${startupName}</strong> — a student startup from VJ College
            working in the <strong>${domain}</strong> space.
          </p>

          <div style="background: #F8FAFC; border-left: 4px solid #1D9E75; padding: 16px 20px; margin: 24px 0; border-radius: 0 8px 8px 0;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em;">Introduced by</p>
            <p style="margin: 0; font-size: 16px; color: #111827; font-weight: bold;">${sourcerName}</p>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748B;">A student at VJ College who believes this connection could be valuable for both parties.</p>
          </div>

          <p style="font-size: 15px; color: #374151; line-height: 1.8;">
            ${founderName} and their team are looking for guidance, early feedback, or
            a short conversation with someone experienced in your domain.
            Your insights could be invaluable to their journey.
          </p>

          <p style="font-size: 15px; color: #374151; line-height: 1.8;">
            To connect with ${founderName} and view their startup profile,
            simply sign in to the VJ Startups platform using your Google account:
          </p>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${loginLink}" style="display: inline-block; background: linear-gradient(135deg, #1D9E75, #157A5C); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; letter-spacing: 0.02em; box-shadow: 0 4px 12px rgba(29,158,117,0.3);">
              Join VJ Startups Platform →
            </a>
          </div>

          <p style="font-size: 13px; color: #94A3B8; text-align: center; line-height: 1.6;">
            Sign in with the Google account associated with this email address.<br/>
            Your profile has already been set up — it only takes a moment.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 28px 0;" />

          <p style="font-size: 12px; color: #9CA3AF; line-height: 1.6;">
            This invitation was facilitated by VJ Startups, the student startup support
            ecosystem at VJ College. If you have any concerns or did not expect this email
            please reply directly and we will assist you.
          </p>
        </div>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Mentor login invite email sent to: ${mentorEmail}`);
}

module.exports = {
  sendSourcerIntroRequestEmail,
  sendLeadInviteEmail,
  sendSourcerNotificationEmail,
  sendWelcomeEmail,
  sendVolunteerNotificationEmail,
  sendMentorLoginInviteEmail
};
