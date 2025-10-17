'use strict';

const fs = require('fs');
const path = require('path');

const dataDirectoryPath = path.join(__dirname, 'data');
const requestsFilePath = path.join(dataDirectoryPath, 'requests.json');

/**
 * In-memory cache of requests to minimize disk reads. Persisted to JSON file.
 */
let cachedRequests = [];
let writeQueue = Promise.resolve();

async function ensureDataFile() {
  await fs.promises.mkdir(dataDirectoryPath, { recursive: true });
  try {
    const content = await fs.promises.readFile(requestsFilePath, 'utf8');
    const parsed = JSON.parse(content);
    cachedRequests = Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      await fs.promises.writeFile(requestsFilePath, '[]', 'utf8');
      cachedRequests = [];
    } else {
      throw err;
    }
  }
}

function getRequests() {
  return [...cachedRequests].sort((a, b) => {
    const at = a.scheduledAt || a.receivedAt || '';
    const bt = b.scheduledAt || b.receivedAt || '';
    return at.localeCompare(bt);
  });
}

function findRequestIndexById(id) {
  return cachedRequests.findIndex((r) => r.id === id);
}

function queuePersist() {
  writeQueue = writeQueue.then(() =>
    fs.promises.writeFile(requestsFilePath, JSON.stringify(cachedRequests, null, 2), 'utf8')
  );
  return writeQueue;
}

async function addRequest(requestRecord) {
  cachedRequests.push(requestRecord);
  await queuePersist();
  return requestRecord;
}

async function updateRequestById(id, updates) {
  const idx = findRequestIndexById(id);
  if (idx === -1) return null;
  const current = cachedRequests[idx];
  const updated = { ...current, ...updates };
  cachedRequests[idx] = updated;
  await queuePersist();
  return updated;
}

module.exports = {
  ensureDataFile,
  getRequests,
  addRequest,
  updateRequestById,
};
