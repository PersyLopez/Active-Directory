'use strict';

const nodemailer = require('nodemailer');
const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

function buildTransport() {
  try {
    if (process.env.SMTP_URL) {
      return nodemailer.createTransport(process.env.SMTP_URL);
    }
    const host = process.env.SMTP_HOST;
    if (host) {
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const auth = user && pass ? { user, pass } : undefined;
      return nodemailer.createTransport({ host, port, secure, auth });
    }
    // Fallback: log-only transport for dev
    return nodemailer.createTransport({ jsonTransport: true });
  } catch (err) {
    logger.error({ err }, 'Failed to create mail transport');
    return nodemailer.createTransport({ jsonTransport: true });
  }
}

const transporter = buildTransport();

function parseRecipients() {
  const value = process.env.TECH_EMAILS || '';
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function formatRequestLines(record) {
  const lines = [
    `Request ID: ${record.id}`,
    `Received: ${record.receivedAt}`,
    `Service: ${record.service}`,
    `Name: ${record.name}`,
    `Phone: ${record.phone}`,
    `Email: ${record.email || '-'}`,
    `Vehicle: ${[record.vehicleYear, record.vehicleMake, record.vehicleModel].filter(Boolean).join(' ') || '-'}`,
    `Problem: ${record.problemDescription || '-'}`,
  ];
  if (record.scheduledAt) {
    lines.push(`Scheduled At: ${record.scheduledAt}`);
  }
  return lines.join('\n');
}

async function sendNewRequestEmail(record) {
  const recipients = parseRecipients();
  if (recipients.length === 0) {
    logger.warn('TECH_EMAILS not set; skipping email send');
    return { skipped: true };
  }
  const from = process.env.FROM_EMAIL || 'no-reply@localhost';
  const subject = `New Service Request: ${record.service} (${record.name})`;
  const text = formatRequestLines(record);
  const info = await transporter.sendMail({ from, to: recipients, subject, text });
  logger.info({ event: 'email_sent_new_request', info });
  return info;
}

async function sendScheduleUpdateEmail(record) {
  const recipients = parseRecipients();
  if (recipients.length === 0) {
    logger.warn('TECH_EMAILS not set; skipping schedule email');
    return { skipped: true };
  }
  const from = process.env.FROM_EMAIL || 'no-reply@localhost';
  const subject = `Request Scheduled: ${record.service} (${record.name})`;
  const text = `The following request has been scheduled.\n\n${formatRequestLines(record)}`;
  const info = await transporter.sendMail({ from, to: recipients, subject, text });
  logger.info({ event: 'email_sent_schedule_update', info });
  return info;
}

module.exports = {
  sendNewRequestEmail,
  sendScheduleUpdateEmail,
};
