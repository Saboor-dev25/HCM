import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email, resetUrl) {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    ...(process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    } : {}),
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: "Reset your Nexus password",
    text: `Use this link to reset your password. It expires in 30 minutes.\n\n${resetUrl}`,
    html: `<p>Use the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetUrl}">Reset password</a></p>`,
  });
}
