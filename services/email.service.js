const nodemailer = require("nodemailer");
const config = require("../config/env");
const logger = require("../config/logger");

// Without SMTP settings (local dev, tests) emails are written to the log instead of sent
const transporter = config.mail.isConfigured
  ? nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: { user: config.mail.user, pass: config.mail.pass },
    })
  : null;

const sendEmail = async ({ to, subject, html, text }) => {
  if (!transporter) {
    logger.info({ to, subject, text }, "Email not sent (SMTP not configured)");
    return;
  }
  await transporter.sendMail({ from: config.mail.from, to, subject, html, text });
};

module.exports = { sendEmail };
