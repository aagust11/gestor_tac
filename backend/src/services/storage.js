import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const DEFAULT_DATA_PATH = path.join(BACKEND_ROOT, 'data.json');

const INITIAL_DATA_SCHEMA = {
  devices: [],
  people: [],
  assignments: [],
  incidents: []
};

let writeQueue = Promise.resolve();

function withWriteQueue(task) {
  const operation = writeQueue.then(task);
  writeQueue = operation.catch(() => {});
  return operation;
}

function normalizeDataPath(dataPath = DEFAULT_DATA_PATH) {
  return path.isAbsolute(dataPath)
    ? dataPath
    : path.resolve(BACKEND_ROOT, dataPath);
}

export async function ensureDataFile(dataPath = DEFAULT_DATA_PATH) {
  const normalizedPath = normalizeDataPath(dataPath);
  const exists = await fs.pathExists(normalizedPath);

  if (!exists) {
    await fs.ensureDir(path.dirname(normalizedPath));
    await fs.writeJson(normalizedPath, INITIAL_DATA_SCHEMA, { spaces: 2 });
    return normalizedPath;
  }

  const content = await fs.readJson(normalizedPath);
  const normalizedContent = {
    devices: Array.isArray(content.devices) ? content.devices : [],
    people: Array.isArray(content.people) ? content.people : [],
    assignments: Array.isArray(content.assignments) ? content.assignments : [],
    incidents: Array.isArray(content.incidents) ? content.incidents : []
  };

  if (JSON.stringify(content) !== JSON.stringify(normalizedContent)) {
    await fs.writeJson(normalizedPath, normalizedContent, { spaces: 2 });
  }

  return normalizedPath;
}

export async function readData(dataPath = DEFAULT_DATA_PATH) {
  const normalizedPath = await ensureDataFile(dataPath);
  return fs.readJson(normalizedPath);
}

export async function writeData(nextData, dataPath = DEFAULT_DATA_PATH) {
  return withWriteQueue(async () => {
    const normalizedPath = await ensureDataFile(dataPath);
    const payload = {
      devices: Array.isArray(nextData.devices) ? nextData.devices : [],
      people: Array.isArray(nextData.people) ? nextData.people : [],
      assignments: Array.isArray(nextData.assignments) ? nextData.assignments : [],
      incidents: Array.isArray(nextData.incidents) ? nextData.incidents : []
    };

    await fs.writeJson(normalizedPath, payload, { spaces: 2 });
    return payload;
  });
}

export async function updateData(updater, dataPath = DEFAULT_DATA_PATH) {
  return withWriteQueue(async () => {
    const normalizedPath = await ensureDataFile(dataPath);
    const currentData = await fs.readJson(normalizedPath);
    const nextData = await updater(currentData);
    const payload = {
      devices: Array.isArray(nextData.devices) ? nextData.devices : [],
      people: Array.isArray(nextData.people) ? nextData.people : [],
      assignments: Array.isArray(nextData.assignments) ? nextData.assignments : [],
      incidents: Array.isArray(nextData.incidents) ? nextData.incidents : []
    };

    await fs.writeJson(normalizedPath, payload, { spaces: 2 });
    return payload;
  });
}

export { DEFAULT_DATA_PATH, INITIAL_DATA_SCHEMA, normalizeDataPath };
