'use strict';

const fs = require('fs');
const path = require('path');

const dataDirectoryPath = path.join(__dirname, 'data');
const contentFilePath = path.join(dataDirectoryPath, 'content.json');

const defaultContent = {
  metaTitle: 'Fix&Go Mobile Tire Service - 24/7 Emergency Auto Repair',
  metaDescription:
    '24/7 emergency mobile tire and auto repair across New Jersey and Pennsylvania. We come to you at home, work, or roadside.',
  siteName: '🚨 Fix&Go Mobile Tire Service',
  heroTitle: 'Professional Mobile Tire & Auto Repair Service',
  heroSubtitle:
    'Professional 24/7 mobile tire and auto repair services throughout New Jersey and Pennsylvania. We come to you - at home, work, or roadside! ',
  emergencyCtaHeading: '🚨 Need Help Right Now?',
  emergencyCtaText: "Don't wait — we're here 24/7 for emergency roadside assistance.",
  servicesOverviewTitle: 'Our Emergency & Mobile Services',
  aboutText:
    'Professional mobile tire and auto repair services. 24/7 emergency service available. We come to you!',
  contactTitle: 'Need Help? Contact Us Now!',
  phoneDigits: '5551234567',
  phoneDisplay: '(555) 123-4567',
  email: 'info@fixandgo.com',
};

let cached = null;
let writeQueue = Promise.resolve();

async function ensureContentFile() {
  await fs.promises.mkdir(dataDirectoryPath, { recursive: true });
  try {
    const content = await fs.promises.readFile(contentFilePath, 'utf8');
    const parsed = JSON.parse(content);
    cached = { ...defaultContent, ...(parsed || {}) };
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      cached = { ...defaultContent };
      await fs.promises.writeFile(
        contentFilePath,
        JSON.stringify(cached, null, 2),
        'utf8'
      );
    } else {
      throw err;
    }
  }
}

function getContent() {
  if (!cached) return { ...defaultContent };
  return { ...defaultContent, ...cached };
}

const allowedKeys = new Set(Object.keys(defaultContent));

async function updateContent(partial) {
  const current = getContent();
  const next = { ...current };
  for (const [key, value] of Object.entries(partial || {})) {
    if (!allowedKeys.has(key)) continue;
    if (typeof value === 'string') {
      next[key] = value;
    }
  }
  cached = next;
  writeQueue = writeQueue.then(() =>
    fs.promises.writeFile(contentFilePath, JSON.stringify(next, null, 2), 'utf8')
  );
  await writeQueue;
  return getContent();
}

module.exports = {
  ensureContentFile,
  getContent,
  updateContent,
  defaultContent,
};
