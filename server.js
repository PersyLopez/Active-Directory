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

const app = express();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', true);

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

// Simple in-memory store for demo purposes
const inMemoryRequests = [];

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

app.post('/api/requests', (req, res) => {
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

  inMemoryRequests.push(record);
  logger.info({ event: 'service_request_received', record });

  return res.status(201).json({ requestId, status: 'received' });
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
