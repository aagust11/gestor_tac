import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(BACKEND_ROOT, 'config.json');

const REQUIRED_CONFIG_FIELDS = [
  'dataPath',
  'assignacionsXlsxPath',
  'estatsXlsxPath'
];

function resolvePath(filePath) {
  return path.isAbsolute(filePath)
    ? filePath
    : path.resolve(BACKEND_ROOT, filePath);
}

async function assertWritableFile(filePath, { allowCreate = false } = {}) {
  const exists = await fs.pathExists(filePath);

  if (!exists && !allowCreate) {
    throw new Error(`El fitxer no existeix: ${filePath}`);
  }

  if (!exists && allowCreate) {
    await fs.ensureDir(path.dirname(filePath));
    await fs.ensureFile(filePath);
  }

  const fd = await fs.open(filePath, 'r+');
  try {
    await fs.write(fd, Buffer.alloc(0), 0, 0, 0);
  } finally {
    await fs.close(fd);
  }
}

export async function loadConfig(configPath = CONFIG_PATH) {
  const exists = await fs.pathExists(configPath);

  if (!exists) {
    throw new Error(`No s'ha trobat config.json a ${configPath}`);
  }

  const config = await fs.readJson(configPath);

  for (const field of REQUIRED_CONFIG_FIELDS) {
    if (typeof config[field] !== 'string' || !config[field].trim()) {
      throw new Error(`El camp ${field} és obligatori i ha de ser una cadena no buida.`);
    }
  }

  return {
    ...config,
    dataPath: resolvePath(config.dataPath),
    assignacionsXlsxPath: resolvePath(config.assignacionsXlsxPath),
    estatsXlsxPath: resolvePath(config.estatsXlsxPath)
  };
}

export async function validateConfigPaths(config) {
  await assertWritableFile(config.dataPath, { allowCreate: true });
  await assertWritableFile(config.assignacionsXlsxPath, { allowCreate: false });
  await assertWritableFile(config.estatsXlsxPath, { allowCreate: false });
}

export async function loadAndValidateConfig(configPath = CONFIG_PATH) {
  const config = await loadConfig(configPath);
  await validateConfigPaths(config);
  return config;
}

export async function testWriteAccess(configPath = CONFIG_PATH) {
  const config = await loadAndValidateConfig(configPath);

  return {
    ok: true,
    files: {
      dataPath: config.dataPath,
      assignacionsXlsxPath: config.assignacionsXlsxPath,
      estatsXlsxPath: config.estatsXlsxPath
    }
  };
}

export { CONFIG_PATH, REQUIRED_CONFIG_FIELDS, resolvePath };
