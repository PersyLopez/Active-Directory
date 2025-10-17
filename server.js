'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const pino = require('pino');
const { z } = require('zod');
const crypto = require('crypto');
const { ensureDataFile, getRequests, addRequest, updateRequestById } = require('./store');
const { sendNewRequestEmail, sendScheduleUpdateEmail } = require('./email');
const { ensureContentFile, getContent, updateContent } = require('./contentStore');

const app = express();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const PORT = Number(process.env.PORT) || 3000;

// Configure trust proxy safely; avoid permissive 'true'
const TRUST_PROXY = process.env.TRUST_PROXY;
if (TRUST_PROXY && /^\d+$/.test(TRUST_PROXY)) {
  app.set('trust proxy', Number(TRUST_PROXY));
} else {
  app.set('trust proxy', 0);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);
app.use(compression());

app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

app.use(express.json({ limit: '100kb' }));

// Restrictive CORS: allow configurable origins, default to same-origin only
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // same-origin or curl
      if (allowedOrigins.length === 0) return callback(null, false);
      const ok = allowedOrigins.includes(origin);
      callback(ok ? null : new Error('Not allowed by CORS'), ok);
    },
  })
);

// Basic rate limiting per IP for API routes
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 60),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Initialize persistent stores on startup
ensureDataFile().catch((err) => {
  logger.error({ err }, 'Failed to initialize data file');
  process.exit(1);
});
ensureContentFile().catch((err) => {
  logger.error({ err }, 'Failed to initialize content file');
  process.exit(1);
});

// Health endpoints
app.get('/healthz', (req, res) => {
  res.json({
    status: 'ok',
    uptimeMs: Math.round(process.uptime() * 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '0.0.0',
  });
});

app.get('/readyz', (req, res) => {
  res.json({ ready: true });
});

// Validation for incoming service requests
const serviceEnum = z.enum([
  'emergency',
  'tire-repair',
  'battery-replacement',
  'tire-replacement',
  'oil-change',
  'brake-service',
  'diagnostic',
  'other',
]);

const requestSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  email: z
    .string()
    .email()
    .optional()
    .or(z.literal('').transform(() => undefined)),
  vehicleYear: z.string().optional(),
  vehicleMake: z.string().optional(),
  vehicleModel: z.string().optional(),
  problemDescription: z.string().optional(),
  service: serviceEnum,
  scheduledAt: z.string().optional(),
});

app.post('/api/requests', async (req, res) => {
  const parseResult = requestSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({
      error: 'Invalid request payload',
      details: parseResult.error.flatten(),
    });
  }

  const requestData = parseResult.data;
  const requestId = crypto.randomUUID();
  const receivedAt = new Date().toISOString();

  const record = {
    id: requestId,
    receivedAt,
    ip: req.ip,
    userAgent: req.get('user-agent') || '',
    ...requestData,
  };

  await addRequest(record);
  logger.info({ event: 'service_request_received', record });
  try {
    await sendNewRequestEmail(record);
  } catch (err) {
    logger.error({ err }, 'Failed to send new request email');
  }
  return res.status(201).json({ requestId, status: 'received' });
});

// Simple token auth middleware for admin endpoints
function requireAdmin(req, res, next) {
  const token = req.get('x-admin-token') || req.query.token;
  const expected = process.env.ADMIN_TOKEN || '';
  if (!expected || token !== expected) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Admin: list requests/events
app.get('/api/admin/requests', requireAdmin, (req, res) => {
  res.json({ items: getRequests() });
});

// Admin: set or update schedule time for a request
const scheduleSchema = z.object({
  scheduledAt: z.string().min(1),
});

app.post('/api/admin/requests/:id/schedule', requireAdmin, async (req, res) => {
  const id = req.params.id;
  const parse = scheduleSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  const updated = await updateRequestById(id, { scheduledAt: parse.data.scheduledAt });
  if (!updated) return res.status(404).json({ error: 'Not found' });
  try {
    await sendScheduleUpdateEmail(updated);
  } catch (err) {
    logger.error({ err }, 'Failed to send schedule update email');
  }
  res.json({ ok: true, item: updated });
});

// Public content endpoint
app.get('/api/content', (req, res) => {
  res.json(getContent());
});

// Admin content endpoints
app.get('/api/admin/content', requireAdmin, (req, res) => {
  res.json(getContent());
});

app.post('/api/admin/content', requireAdmin, async (req, res) => {
  // Accept partial object of string values; filtering is handled in contentStore
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Invalid body' });
  }
  try {
    const updated = await updateContent(req.body);
    res.json(updated);
  } catch (err) {
    logger.error({ err }, 'Failed to update content');
    res.status(500).json({ error: 'Failed to update content' });
  }
});

// Static hosting
const publicDir = path.join(__dirname, 'public');
app.use(
  express.static(publicDir, {
    index: 'index.html',
    maxAge: '1h',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Minimal security headers for static assets
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
    },
  })
);

// Fallback 404 for non-static, non-API routes
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  return res.status(404).sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  logger.info(`Server listening on http://localhost:${PORT}`);
});
