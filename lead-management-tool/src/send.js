import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  if (!transporter) {
    const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM_EMAIL"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length) throw new Error(`Missing SMTP env vars: ${missing.join(", ")}`);

    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, body }) {
  const fromName = process.env.SMTP_FROM_NAME || "LogBATT";
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const bcc = process.env.SMTP_BCC || undefined;

  return getTransporter().sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to,
    bcc,
    subject,
    text: body,
  });
}
