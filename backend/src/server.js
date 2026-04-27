import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import {
  ESTATS_ASSIGNACIO,
  ESTATS_DISPOSITIU,
  ESTATS_INCIDENCIA,
  TIPUS_DISPOSITIU
} from './constants/domainConstants.js';
import {
  getConfigStatus,
  loadConfig,
  saveConfig,
  testWriteAccess
} from './services/configService.js';
import { appendAssignacio, appendEstat } from './services/xlsxService.js';
import { ensureDataFile, readData, updateData } from './services/storage.js';
import { validateAssignment } from './validators/assignmentValidator.js';
import { buildValidationError } from './validators/commonValidator.js';
import { validateDevice } from './validators/deviceValidator.js';
import { validateIncident } from './validators/incidentValidator.js';
import { validatePerson } from './validators/personValidator.js';

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://*.github.io'
];

function isAllowedOrigin(origin) {
  if (!origin) {
    return true;
  }

  const configured = process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean)
    : DEFAULT_ALLOWED_ORIGINS;

  return configured.some((rule) => {
    if (rule.includes('*')) {
      const regex = new RegExp(`^${rule.replace(/\./g, '\\.').replace(/\*/g, '.*')}$`);
      return regex.test(origin);
    }
    return rule === origin;
  });
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origen no permès per CORS: ${origin}`));
    }
  })
);
app.use(express.json());

const api = express.Router();
let runtimeConfigPromise = null;

function nowIso() {
  return new Date().toISOString();
}

function withTimestampsOnCreate(payload) {
  const timestamp = nowIso();
  return {
    ...payload,
    createdAt: timestamp,
    updatedAt: timestamp
  };
}

function withTimestampsOnUpdate(previous, payload) {
  return {
    ...previous,
    ...payload,
    createdAt: previous.createdAt ?? nowIso(),
    updatedAt: nowIso()
  };
}

function sendNotFound(res, resourceName) {
  return res.status(404).json({
    ok: false,
    error: `${resourceName} no trobat/da.`
  });
}

function normalizeComparable(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function valueMatches(haystack, needle) {
  const normalizedNeedle = normalizeComparable(needle);
  if (!normalizedNeedle) {
    return true;
  }

  return normalizeComparable(haystack).includes(normalizedNeedle);
}

function findPersonBySearch(people, search = {}) {
  const { id, identificador, nom, correu } = search;

  if (id) {
    return people.find((person) => person.id === id) ?? null;
  }

  const candidates = people.filter((person) => (
    valueMatches(person.identificador, identificador)
    && valueMatches(person.nom, nom)
    && valueMatches(person.correu, correu)
  ));

  return candidates.length === 1 ? candidates[0] : null;
}

function findDeviceBySearch(devices, search = {}) {
  const { id, sace, sn } = search;

  if (id) {
    return devices.find((device) => device.id === id) ?? null;
  }

  const candidates = devices.filter((device) => (
    valueMatches(device.sace, sace)
    && valueMatches(device.sn, sn)
  ));

  return candidates.length === 1 ? candidates[0] : null;
}

function mapAssignmentDetail(assignment, people, devices) {
  return {
    ...assignment,
    person: people.find((item) => item.id === assignment.personId) ?? null,
    device: devices.find((item) => item.id === assignment.deviceId) ?? null
  };
}

async function getRuntimeConfig() {
  runtimeConfigPromise ??= loadConfig();
  return runtimeConfigPromise;
}

async function getDataPathFromConfig() {
  const config = await getRuntimeConfig();
  return config.dataPath;
}

async function readRuntimeData() {
  const dataPath = await getDataPathFromConfig();
  return readData(dataPath);
}

async function updateRuntimeData(updater) {
  const dataPath = await getDataPathFromConfig();
  return updateData(updater, dataPath);
}

async function appendAssignmentRowsToExcel(config, person, device) {
  await appendAssignacio(config.assignacionsXlsxPath, person.identificador ?? '', device.sace ?? '');

  if ([TIPUS_DISPOSITIU.ORDINADOR_ALUMNE, TIPUS_DISPOSITIU.ORDINADOR_DOCENT].includes(device.tipus)) {
    await appendEstat(config.estatsXlsxPath, device.sace ?? '', ESTATS_DISPOSITIU.ENTREGAT);
  }
}

function handleValidationResult(errors) {
  if (errors.length > 0) {
    throw buildValidationError(errors);
  }
}

api.get('/health', (_req, res) => {
  res.json({ ok: true, servei: 'backend', basePath: '/api' });
});

api.get('/config', async (_req, res, next) => {
  try {
    const status = await getConfigStatus();
    res.json({ ok: true, ...status });
  } catch (error) {
    next(error);
  }
});

api.put('/config', async (req, res, next) => {
  try {
    const saved = await saveConfig(req.body ?? {});
    runtimeConfigPromise = null;
    const status = await getConfigStatus();
    res.json({ ok: true, config: saved, files: status.files });
  } catch (error) {
    next(error);
  }
});

api.post('/config/test-write', async (_req, res) => {
  try {
    const result = await testWriteAccess();
    res.json(result);
  } catch (error) {
    res.status(400).json({
      ok: false,
      error: error instanceof Error ? error.message : 'Error desconegut comprovant escriptura.'
    });
  }
});

api.get('/devices', async (_req, res, next) => {
  try {
    const data = await readRuntimeData();
    res.json(data.devices);
  } catch (error) {
    next(error);
  }
});

api.get('/devices/search', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const { q, sace, sn, tipus } = req.query;
    const queryText = typeof q === 'string' ? q : '';

    const devices = data.devices.filter((device) => (
      valueMatches(device.sace, sace ?? queryText)
      || valueMatches(device.sn, sn ?? queryText)
      || valueMatches(device.tipus, tipus ?? queryText)
    ));

    res.json(devices);
  } catch (error) {
    next(error);
  }
});

api.get('/devices/:id', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const device = data.devices.find((item) => item.id === req.params.id);

    if (!device) {
      return sendNotFound(res, 'Dispositiu');
    }

    return res.json(device);
  } catch (error) {
    return next(error);
  }
});

api.get('/devices/:id/history', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const device = data.devices.find((item) => item.id === req.params.id);

    if (!device) {
      return sendNotFound(res, 'Dispositiu');
    }

    const assignments = data.assignments
      .filter((item) => item.deviceId === req.params.id)
      .map((item) => mapAssignmentDetail(item, data.people, data.devices));

    const incidents = data.incidents.filter((item) => item.deviceId === req.params.id);

    return res.json({ device, assignments, incidents });
  } catch (error) {
    return next(error);
  }
});

api.post('/devices', async (req, res, next) => {
  try {
    const created = await updateRuntimeData(async (currentData) => {
      const errors = validateDevice(req.body, currentData.devices);
      handleValidationResult(errors);

      const payload = withTimestampsOnCreate({ ...req.body, id: uuidv4() });
      return { ...currentData, devices: [...currentData.devices, payload] };
    });

    res.status(201).json(created.devices.at(-1));
  } catch (error) {
    next(error);
  }
});

api.put('/devices/:id', async (req, res, next) => {
  try {
    let updatedDevice = null;

    await updateRuntimeData(async (currentData) => {
      const config = await getRuntimeConfig();
      const index = currentData.devices.findIndex((item) => item.id === req.params.id);
      if (index === -1) {
        const error = new Error('Dispositiu no trobat/da.');
        error.status = 404;
        throw error;
      }

      const errors = validateDevice(req.body, currentData.devices, { currentId: req.params.id });
      handleValidationResult(errors);

      const nextDevices = [...currentData.devices];
      const previous = nextDevices[index];
      updatedDevice = withTimestampsOnUpdate(previous, req.body);
      nextDevices[index] = updatedDevice;

      if (previous.estat !== updatedDevice.estat) {
        await appendEstat(config.estatsXlsxPath, updatedDevice.sace ?? '', updatedDevice.estat ?? '');
      }

      return { ...currentData, devices: nextDevices };
    });

    res.json(updatedDevice);
  } catch (error) {
    next(error);
  }
});

api.delete('/devices/:id', async (req, res, next) => {
  try {
    let found = false;

    await updateRuntimeData(async (currentData) => {
      found = currentData.devices.some((item) => item.id === req.params.id);
      if (!found) {
        return currentData;
      }

      return {
        ...currentData,
        devices: currentData.devices.filter((item) => item.id !== req.params.id)
      };
    });

    if (!found) {
      return sendNotFound(res, 'Dispositiu');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

api.get('/people', async (_req, res, next) => {
  try {
    const data = await readRuntimeData();
    res.json(data.people);
  } catch (error) {
    next(error);
  }
});

api.get('/people/search', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const { q, nom, correu, identificador } = req.query;
    const queryText = typeof q === 'string' ? q : '';

    const people = data.people.filter((person) => (
      valueMatches(person.nom, nom ?? queryText)
      || valueMatches(person.correu, correu ?? queryText)
      || valueMatches(person.identificador, identificador ?? queryText)
    ));

    res.json(people);
  } catch (error) {
    next(error);
  }
});

api.get('/people/:id', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const person = data.people.find((item) => item.id === req.params.id);

    if (!person) {
      return sendNotFound(res, 'Persona');
    }

    const activeAssignments = data.assignments
      .filter((item) => item.personId === person.id && item.estat === ESTATS_ASSIGNACIO.ACTIVA)
      .map((item) => mapAssignmentDetail(item, data.people, data.devices));

    return res.json({ ...person, activeAssignments });
  } catch (error) {
    return next(error);
  }
});

api.post('/people', async (req, res, next) => {
  try {
    const created = await updateRuntimeData(async (currentData) => {
      const errors = validatePerson(req.body, currentData.people);
      handleValidationResult(errors);

      const payload = withTimestampsOnCreate({ ...req.body, id: uuidv4() });
      return { ...currentData, people: [...currentData.people, payload] };
    });

    res.status(201).json(created.people.at(-1));
  } catch (error) {
    next(error);
  }
});

api.put('/people/:id', async (req, res, next) => {
  try {
    let updatedPerson = null;

    await updateRuntimeData(async (currentData) => {
      const index = currentData.people.findIndex((item) => item.id === req.params.id);
      if (index === -1) {
        const error = new Error('Persona no trobat/da.');
        error.status = 404;
        throw error;
      }

      const errors = validatePerson(req.body, currentData.people, { currentId: req.params.id });
      handleValidationResult(errors);

      const nextPeople = [...currentData.people];
      updatedPerson = withTimestampsOnUpdate(nextPeople[index], req.body);
      nextPeople[index] = updatedPerson;

      return { ...currentData, people: nextPeople };
    });

    res.json(updatedPerson);
  } catch (error) {
    next(error);
  }
});

api.delete('/people/:id', async (req, res, next) => {
  try {
    let found = false;

    await updateRuntimeData(async (currentData) => {
      found = currentData.people.some((item) => item.id === req.params.id);
      if (!found) {
        return currentData;
      }

      return {
        ...currentData,
        people: currentData.people.filter((item) => item.id !== req.params.id)
      };
    });

    if (!found) {
      return sendNotFound(res, 'Persona');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

api.get('/assignments', async (_req, res, next) => {
  try {
    const data = await readRuntimeData();
    res.json(data.assignments.map((item) => mapAssignmentDetail(item, data.people, data.devices)));
  } catch (error) {
    next(error);
  }
});

api.post('/assignments/preview', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const person = findPersonBySearch(data.people, req.body.personSearch ?? { id: req.body.personId });
    if (!person) {
      return res.json({ ok: false, person: null, activeAssignments: [] });
    }

    const activeAssignments = data.assignments
      .filter((item) => item.personId === person.id && item.estat === ESTATS_ASSIGNACIO.ACTIVA)
      .map((item) => mapAssignmentDetail(item, data.people, data.devices));

    return res.json({ ok: true, person, activeAssignments });
  } catch (error) {
    return next(error);
  }
});

api.get('/assignments/:id', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const assignment = data.assignments.find((item) => item.id === req.params.id);

    if (!assignment) {
      return sendNotFound(res, 'Assignació');
    }

    return res.json(mapAssignmentDetail(assignment, data.people, data.devices));
  } catch (error) {
    return next(error);
  }
});

api.post('/assignments', async (req, res, next) => {
  try {
    let summary = null;

    await updateRuntimeData(async (currentData) => {
      const config = await getRuntimeConfig();
      const person = findPersonBySearch(currentData.people, req.body.personSearch ?? { id: req.body.personId });
      if (!person) {
        const error = new Error('Persona no trobada amb els criteris de cerca.');
        error.status = 404;
        throw error;
      }

      const device = findDeviceBySearch(currentData.devices, req.body.deviceSearch ?? { id: req.body.deviceId });
      if (!device) {
        const error = new Error('Dispositiu no trobat amb els criteris de cerca.');
        error.status = 404;
        throw error;
      }

      const nextAssignments = [...currentData.assignments];
      const nextDevices = [...currentData.devices];
      const timestamp = nowIso();

      const activeForPerson = nextAssignments.filter((item) => (
        item.personId === person.id && item.estat === ESTATS_ASSIGNACIO.ACTIVA
      ));

      const shouldCloseAllPrevious = Boolean(req.body.returnPreviousAssignments);
      const selectedToReturn = Array.isArray(req.body.returnAssignmentIds)
        ? req.body.returnAssignmentIds
        : [];

      const toReturnIds = shouldCloseAllPrevious
        ? new Set(activeForPerson.map((item) => item.id))
        : new Set(selectedToReturn);

      const closedAssignments = [];

      for (let index = 0; index < nextAssignments.length; index += 1) {
        const assignment = nextAssignments[index];
        if (assignment.personId !== person.id || assignment.estat !== ESTATS_ASSIGNACIO.ACTIVA) {
          continue;
        }

        if (!toReturnIds.has(assignment.id)) {
          continue;
        }

        nextAssignments[index] = withTimestampsOnUpdate(assignment, {
          estat: ESTATS_ASSIGNACIO.FINALITZADA,
          endedAt: timestamp
        });
        closedAssignments.push(nextAssignments[index]);

        const oldDeviceIndex = nextDevices.findIndex((candidate) => candidate.id === assignment.deviceId);
        if (oldDeviceIndex !== -1) {
          const oldDevice = nextDevices[oldDeviceIndex];
          if (oldDevice.estat === ESTATS_DISPOSITIU.ENTREGAT) {
            nextDevices[oldDeviceIndex] = withTimestampsOnUpdate(oldDevice, {
              estat: ESTATS_DISPOSITIU.DISPONIBLE
            });
            await appendEstat(config.estatsXlsxPath, oldDevice.sace ?? '', ESTATS_DISPOSITIU.DISPONIBLE);
          }
        }
      }

      const newAssignment = withTimestampsOnCreate({
        id: uuidv4(),
        personId: person.id,
        deviceId: device.id,
        estat: ESTATS_ASSIGNACIO.ACTIVA,
        startedAt: timestamp,
        endedAt: null
      });

      const validationErrors = validateAssignment(newAssignment, {
        ...currentData,
        assignments: nextAssignments
      });
      handleValidationResult(validationErrors);

      const targetDeviceIndex = nextDevices.findIndex((candidate) => candidate.id === device.id);
      if (targetDeviceIndex === -1) {
        const error = new Error('Dispositiu no trobat per actualitzar estat.');
        error.status = 404;
        throw error;
      }

      nextDevices[targetDeviceIndex] = withTimestampsOnUpdate(nextDevices[targetDeviceIndex], {
        estat: ESTATS_DISPOSITIU.ENTREGAT
      });

      await appendAssignmentRowsToExcel(config, person, nextDevices[targetDeviceIndex]);

      summary = {
        closedAssignments,
        newAssignment,
        person,
        activeAssignmentsBefore: activeForPerson.map((item) => mapAssignmentDetail(item, currentData.people, currentData.devices))
      };

      return {
        ...currentData,
        assignments: [...nextAssignments, newAssignment],
        devices: nextDevices
      };
    });

    res.status(201).json({ ok: true, ...summary });
  } catch (error) {
    next(error);
  }
});

api.put('/assignments/:id', async (req, res, next) => {
  try {
    let updatedAssignment = null;

    await updateRuntimeData(async (currentData) => {
      const index = currentData.assignments.findIndex((item) => item.id === req.params.id);
      if (index === -1) {
        const error = new Error('Assignació no trobat/da.');
        error.status = 404;
        throw error;
      }

      const nextPayload = {
        ...currentData.assignments[index],
        ...req.body
      };

      const errors = validateAssignment(nextPayload, currentData, { currentId: req.params.id });
      handleValidationResult(errors);

      const nextAssignments = [...currentData.assignments];
      updatedAssignment = withTimestampsOnUpdate(nextAssignments[index], nextPayload);
      nextAssignments[index] = updatedAssignment;

      return { ...currentData, assignments: nextAssignments };
    });

    res.json(updatedAssignment);
  } catch (error) {
    next(error);
  }
});

api.delete('/assignments/:id', async (req, res, next) => {
  try {
    let found = false;

    await updateRuntimeData(async (currentData) => {
      found = currentData.assignments.some((item) => item.id === req.params.id);
      if (!found) {
        return currentData;
      }

      return {
        ...currentData,
        assignments: currentData.assignments.filter((item) => item.id !== req.params.id)
      };
    });

    if (!found) {
      return sendNotFound(res, 'Assignació');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

api.get('/incidents', async (_req, res, next) => {
  try {
    const data = await readRuntimeData();
    res.json(data.incidents.map((item) => ({
      ...item,
      device: data.devices.find((device) => device.id === item.deviceId) ?? null
    })));
  } catch (error) {
    next(error);
  }
});

api.get('/incidents/:id', async (req, res, next) => {
  try {
    const data = await readRuntimeData();
    const incident = data.incidents.find((item) => item.id === req.params.id);

    if (!incident) {
      return sendNotFound(res, 'Incidència');
    }

    return res.json(incident);
  } catch (error) {
    return next(error);
  }
});

api.post('/incidents', async (req, res, next) => {
  try {
    let createdIncident = null;

    await updateRuntimeData(async (currentData) => {
      const config = await getRuntimeConfig();
      const nextPayload = {
        estat: ESTATS_INCIDENCIA.PENDENT_OBRIR,
        ...req.body
      };

      const errors = validateIncident(nextPayload, currentData);
      handleValidationResult(errors);

      const deviceIndex = currentData.devices.findIndex((item) => item.id === nextPayload.deviceId);
      if (deviceIndex === -1) {
        const error = new Error('El dispositiu no existeix.');
        error.status = 404;
        throw error;
      }

      const nextDevices = [...currentData.devices];
      const device = nextDevices[deviceIndex];

      createdIncident = withTimestampsOnCreate({ ...nextPayload, id: uuidv4() });
      nextDevices[deviceIndex] = withTimestampsOnUpdate(device, {
        estat: ESTATS_DISPOSITIU.PENDENT_REPARACIO
      });

      if ([TIPUS_DISPOSITIU.ORDINADOR_ALUMNE, TIPUS_DISPOSITIU.ORDINADOR_DOCENT].includes(device.tipus)) {
        await appendEstat(config.estatsXlsxPath, device.sace ?? '', ESTATS_DISPOSITIU.PENDENT_REPARACIO);
      }

      return {
        ...currentData,
        incidents: [...currentData.incidents, createdIncident],
        devices: nextDevices
      };
    });

    res.status(201).json(createdIncident);
  } catch (error) {
    next(error);
  }
});

api.put('/incidents/:id', async (req, res, next) => {
  try {
    let updatedIncident = null;

    await updateRuntimeData(async (currentData) => {
      const index = currentData.incidents.findIndex((item) => item.id === req.params.id);
      if (index === -1) {
        const error = new Error('Incidència no trobat/da.');
        error.status = 404;
        throw error;
      }

      const nextPayload = {
        ...currentData.incidents[index],
        ...req.body
      };

      const errors = validateIncident(nextPayload, currentData);
      handleValidationResult(errors);

      const nextIncidents = [...currentData.incidents];
      updatedIncident = withTimestampsOnUpdate(nextIncidents[index], nextPayload);
      nextIncidents[index] = updatedIncident;

      return { ...currentData, incidents: nextIncidents };
    });

    res.json(updatedIncident);
  } catch (error) {
    next(error);
  }
});

api.delete('/incidents/:id', async (req, res, next) => {
  try {
    let found = false;

    await updateRuntimeData(async (currentData) => {
      found = currentData.incidents.some((item) => item.id === req.params.id);
      if (!found) {
        return currentData;
      }

      return {
        ...currentData,
        incidents: currentData.incidents.filter((item) => item.id !== req.params.id)
      };
    });

    if (!found) {
      return sendNotFound(res, 'Incidència');
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
});

app.use('/api', api);

app.use((error, _req, res, _next) => {
  const status = error.status ?? 500;
  const payload = {
    ok: false,
    error: error instanceof Error ? error.message : 'Error intern inesperat.'
  };

  if (Array.isArray(error.details)) {
    payload.details = error.details;
  }

  res.status(status).json(payload);
});

async function bootstrap() {
  try {
    const config = await loadConfig();
    await ensureDataFile(config.dataPath);

    app.listen(PORT, () => {
      console.log(`Servidor backend disponible a http://localhost:${PORT}/api`);
    });
  } catch (error) {
    console.error('No s\'ha pogut iniciar el backend:', error);
    process.exit(1);
  }
}

bootstrap();
