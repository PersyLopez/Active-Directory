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

function formatIcsDate(dt) {
  // ICS requires UTC basic format: YYYYMMDDTHHmmssZ
  const pad = (n) => String(n).padStart(2, '0');
  const y = dt.getUTCFullYear();
  const m = pad(dt.getUTCMonth() + 1);
  const d = pad(dt.getUTCDate());
  const hh = pad(dt.getUTCHours());
  const mm = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function escapeIcsText(text) {
  return (text || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function buildIcs(record) {
  if (!record || !record.scheduledAt) return null;
  const start = new Date(record.scheduledAt);
  if (isNaN(start.getTime())) return null;
  const durationMin = Number(process.env.ICS_DURATION_MINUTES || 60);
  const end = new Date(start.getTime() + durationMin * 60 * 1000);

  const organizerEmail = process.env.FROM_EMAIL || 'no-reply@localhost';
  const summary = `${record.service} - ${record.name}`;
  const description = formatRequestLines(record);
  const uid = `${record.id}@fixandgo.local`;

  const attendees = parseRecipients();
  const attendeeLines = attendees
    .map((email) => `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION:mailto:${email}`)
    .join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Fix&Go//Service Request//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `ORGANIZER:mailto:${organizerEmail}`,
    attendeeLines,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  return ics;
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
  const mail = { from, to: recipients, subject, text };
  // Attach ICS if request already includes a scheduled time
  const ics = buildIcs(record);
  if (ics) {
    mail.icalEvent = { method: 'REQUEST', content: ics };
  }
  const info = await transporter.sendMail(mail);
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
  const ics = buildIcs(record);
  const mail = { from, to: recipients, subject, text };
  if (ics) {
    mail.icalEvent = { method: 'REQUEST', content: ics };
  }
  const info = await transporter.sendMail(mail);
  logger.info({ event: 'email_sent_schedule_update', info });
  return info;
}

module.exports = {
  sendNewRequestEmail,
  sendScheduleUpdateEmail,
};
