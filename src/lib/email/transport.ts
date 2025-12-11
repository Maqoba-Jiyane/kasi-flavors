// src/lib/email/transport.ts
import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST!;
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER!;
const smtpPass = process.env.SMTP_PASS!;

if (!smtpHost || !smtpUser || !smtpPass) {
  console.warn(
    "⚠️ SMTP env vars are missing. Emails will fail until set.",
  );
}

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: true,
  auth: {
    user: smtpUser,
    pass: smtpPass,
  },
});

export async function sendWithTransport(args: {
  from: string;
  replyTo?: string;
  to: string;
  subject: string;
  html: string;
}) {
  const { from, replyTo, to, subject, html } = args;

  await transporter.sendMail({
    from,
    to,
    subject,
    html,
    replyTo,
  });
}
