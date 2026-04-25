import cors from 'cors';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import { ESTATS_ASSIGNACIO, ESTATS_INCIDENCIA } from './constants/domainConstants.js';
import { loadAndValidateConfig, testWriteAccess } from './services/configService.js';
import { ensureDataFile, readData, updateData } from './services/storage.js';
import { validateAssignment } from './validators/assignmentValidator.js';
import { buildValidationError } from './validators/commonValidator.js';
import { validateDevice } from './validators/deviceValidator.js';
import { validateIncident } from './validators/incidentValidator.js';
import { validatePerson } from './validators/personValidator.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: 'http://localhost:5173'
  })
);
app.use(express.json());

const api = express.Router();

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

function handleValidationResult(errors) {
  if (errors.length > 0) {
    throw buildValidationError(errors);
  }
}

api.get('/health', (_req, res) => {
  res.json({ ok: true, servei: 'backend', basePath: '/api' });
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
    const data = await readData();
    res.json(data.devices);
  } catch (error) {
    next(error);
  }
});

api.get('/devices/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const device = data.devices.find((item) => item.id === req.params.id);

    if (!device) {
      return sendNotFound(res, 'Dispositiu');
    }

    return res.json(device);
  } catch (error) {
    return next(error);
  }
});

api.post('/devices', async (req, res, next) => {
  try {
    const created = await updateData(async (currentData) => {
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

    await updateData(async (currentData) => {
      const index = currentData.devices.findIndex((item) => item.id === req.params.id);
      if (index === -1) {
        const error = new Error('Dispositiu no trobat/da.');
        error.status = 404;
        throw error;
      }

      const errors = validateDevice(req.body, currentData.devices, { currentId: req.params.id });
      handleValidationResult(errors);

      const nextDevices = [...currentData.devices];
      updatedDevice = withTimestampsOnUpdate(nextDevices[index], req.body);
      nextDevices[index] = updatedDevice;

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

    await updateData(async (currentData) => {
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
    const data = await readData();
    res.json(data.people);
  } catch (error) {
    next(error);
  }
});

api.get('/people/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const person = data.people.find((item) => item.id === req.params.id);

    if (!person) {
      return sendNotFound(res, 'Persona');
    }

    return res.json(person);
  } catch (error) {
    return next(error);
  }
});

api.post('/people', async (req, res, next) => {
  try {
    const created = await updateData(async (currentData) => {
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

    await updateData(async (currentData) => {
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

    await updateData(async (currentData) => {
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
    const data = await readData();
    res.json(data.assignments);
  } catch (error) {
    next(error);
  }
});

api.get('/assignments/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const assignment = data.assignments.find((item) => item.id === req.params.id);

    if (!assignment) {
      return sendNotFound(res, 'Assignació');
    }

    return res.json(assignment);
  } catch (error) {
    return next(error);
  }
});

api.post('/assignments', async (req, res, next) => {
  try {
    const created = await updateData(async (currentData) => {
      const nextPayload = {
        estat: ESTATS_ASSIGNACIO.ACTIVA,
        ...req.body
      };
      const errors = validateAssignment(nextPayload, currentData);
      handleValidationResult(errors);

      const payload = withTimestampsOnCreate({ ...nextPayload, id: uuidv4() });
      return { ...currentData, assignments: [...currentData.assignments, payload] };
    });

    res.status(201).json(created.assignments.at(-1));
  } catch (error) {
    next(error);
  }
});

api.put('/assignments/:id', async (req, res, next) => {
  try {
    let updatedAssignment = null;

    await updateData(async (currentData) => {
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

    await updateData(async (currentData) => {
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
    const data = await readData();
    res.json(data.incidents);
  } catch (error) {
    next(error);
  }
});

api.get('/incidents/:id', async (req, res, next) => {
  try {
    const data = await readData();
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
    const created = await updateData(async (currentData) => {
      const nextPayload = {
        estat: ESTATS_INCIDENCIA.PENDENT_OBRIR,
        ...req.body
      };

      const errors = validateIncident(nextPayload, currentData);
      handleValidationResult(errors);

      const payload = withTimestampsOnCreate({ ...nextPayload, id: uuidv4() });
      return { ...currentData, incidents: [...currentData.incidents, payload] };
    });

    res.status(201).json(created.incidents.at(-1));
  } catch (error) {
    next(error);
  }
});

api.put('/incidents/:id', async (req, res, next) => {
  try {
    let updatedIncident = null;

    await updateData(async (currentData) => {
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

    await updateData(async (currentData) => {
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
    const config = await loadAndValidateConfig();
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
