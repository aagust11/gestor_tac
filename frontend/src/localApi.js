const STORAGE_KEY = 'gestor_tac_data_v1';
const CONFIG_KEY = 'gestor_tac_config_v1';

const TIPUS_ORDINADORS = new Set(['Ordinador Alumne', 'Ordinador Docent']);

const baseData = {
  devices: [],
  people: [],
  assignments: [],
  incidents: [],
  excelLogs: {
    assignacions: [],
    estats: []
  }
};

const baseConfig = {
  dataPath: 'data.json',
  assignacionsXlsxPath: 'indic_assignacions.xlsx',
  estatsXlsxPath: 'indic_estats.xlsx'
};

function nowIso() {
  return new Date().toISOString();
}

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function normalize(v) {
  return typeof v === 'string' ? v.trim().toLowerCase() : '';
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getData() {
  const data = readJson(STORAGE_KEY, baseData);
  return {
    ...baseData,
    ...data,
    excelLogs: { ...baseData.excelLogs, ...(data.excelLogs || {}) }
  };
}

function saveData(data) {
  writeJson(STORAGE_KEY, data);
}

function getConfig() {
  return { ...baseConfig, ...readJson(CONFIG_KEY, baseConfig) };
}

function saveConfig(config) {
  const merged = { ...baseConfig, ...config };
  writeJson(CONFIG_KEY, merged);
  return merged;
}

function enrichAssignments(data) {
  return data.assignments.map((a) => ({
    ...a,
    person: data.people.find((p) => p.id === a.personId) || null,
    device: data.devices.find((d) => d.id === a.deviceId) || null
  }));
}

function appendEstatLog(data, sace, estat) {
  data.excelLogs.estats.push({ A: '', B: sace || '', C: estat || '', createdAt: nowIso() });
}

function appendAssignacioLog(data, identificador, sace) {
  data.excelLogs.assignacions.push({ A: identificador || '', B: '', C: sace || '', createdAt: nowIso() });
}

function throwError(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}

function checkRequired(value, label) {
  if (!value || !String(value).trim()) throwError(`El camp ${label} és obligatori.`);
}

export async function localApi(path, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const body = options.body ? JSON.parse(options.body) : null;
  const [pathname, search = ''] = path.split('?');
  const params = new URLSearchParams(search);

  const data = getData();

  try {
    if (pathname === '/health' && method === 'GET') return { ok: true, servei: 'frontend-local' };

    if (pathname === '/config' && method === 'GET') {
      const config = getConfig();
      return {
        ok: true,
        config,
        files: Object.fromEntries(Object.entries(config).map(([key, route]) => [key, { exists: false, resolved: route, note: 'No comprovable des de GitHub Pages' }]))
      };
    }

    if (pathname === '/config' && method === 'PUT') {
      const config = saveConfig(body || {});
      return {
        ok: true,
        config,
        files: Object.fromEntries(Object.entries(config).map(([key, route]) => [key, { exists: false, resolved: route, note: 'No comprovable des del navegador' }]))
      };
    }

    if (pathname === '/config/test-write' && method === 'POST') {
      return { ok: false, warning: 'En mode GitHub Pages no es pot escriure al sistema de fitxers local.' };
    }

    if (pathname === '/devices' && method === 'GET') return data.devices;

    if (pathname === '/devices/search' && method === 'GET') {
      const q = normalize(params.get('q'));
      return data.devices.filter((d) => [d.sace, d.sn, d.tipus].some((v) => normalize(v).includes(q)));
    }

    if (pathname === '/devices' && method === 'POST') {
      checkRequired(body?.sace, 'SACE');
      if (data.devices.some((d) => normalize(d.sace) === normalize(body.sace))) throwError('No es permeten SACE duplicats.');
      const row = { id: uid(), sace: body.sace.trim(), sn: body.sn?.trim() || '', tipus: body.tipus, estat: body.estat, createdAt: nowIso(), updatedAt: nowIso() };
      data.devices.push(row);
      saveData(data);
      return row;
    }

    const deviceIdMatch = pathname.match(/^\/devices\/([^/]+)$/);
    if (deviceIdMatch && method === 'PUT') {
      const id = deviceIdMatch[1];
      const prev = data.devices.find((d) => d.id === id);
      if (!prev) throwError('Dispositiu no trobat.', 404);
      checkRequired(body?.sace, 'SACE');
      if (data.devices.some((d) => d.id !== id && normalize(d.sace) === normalize(body.sace))) throwError('No es permeten SACE duplicats.');
      const previousEstat = prev.estat;
      const next = { ...prev, ...body, updatedAt: nowIso() };
      Object.assign(prev, next);
      if (previousEstat !== prev.estat && TIPUS_ORDINADORS.has(prev.tipus)) appendEstatLog(data, prev.sace, prev.estat);
      saveData(data);
      return prev;
    }

    const deviceHistoryMatch = pathname.match(/^\/devices\/([^/]+)\/history$/);
    if (deviceHistoryMatch && method === 'GET') {
      const id = deviceHistoryMatch[1];
      const device = data.devices.find((d) => d.id === id);
      if (!device) throwError('Dispositiu no trobat.', 404);
      return {
        device,
        assignments: enrichAssignments(data).filter((a) => a.deviceId === id),
        incidents: data.incidents.filter((i) => i.deviceId === id)
      };
    }

    if (pathname === '/people' && method === 'GET') return data.people;

    if (pathname === '/people/search' && method === 'GET') {
      const q = normalize(params.get('q'));
      return data.people.filter((p) => [p.nom, p.correu, p.identificador].some((v) => normalize(v).includes(q)));
    }

    if (pathname === '/people' && method === 'POST') {
      checkRequired(body?.identificador, 'Identificador');
      if (data.people.some((p) => normalize(p.identificador) === normalize(body.identificador))) throwError('No es permeten identificadors duplicats.');
      const row = { id: uid(), nom: body.nom?.trim() || '', correu: body.correu?.trim() || '', identificador: body.identificador.trim(), createdAt: nowIso() };
      data.people.push(row);
      saveData(data);
      return row;
    }

    const personIdMatch = pathname.match(/^\/people\/([^/]+)$/);
    if (personIdMatch && method === 'PUT') {
      const id = personIdMatch[1];
      const prev = data.people.find((p) => p.id === id);
      if (!prev) throwError('Persona no trobada.', 404);
      checkRequired(body?.identificador, 'Identificador');
      if (data.people.some((p) => p.id !== id && normalize(p.identificador) === normalize(body.identificador))) throwError('No es permeten identificadors duplicats.');
      Object.assign(prev, { ...prev, ...body, identificador: body.identificador.trim() });
      saveData(data);
      return prev;
    }

    if (personIdMatch && method === 'DELETE') {
      const id = personIdMatch[1];
      if (data.assignments.some((a) => a.personId === id && a.estat === 'Activa')) throwError('No pots eliminar una persona amb assignacions actives.');
      data.people = data.people.filter((p) => p.id !== id);
      saveData(data);
      return null;
    }

    if (pathname === '/assignments' && method === 'GET') return enrichAssignments(data);

    if (pathname === '/assignments/preview' && method === 'POST') {
      const personId = body?.personId;
      return { activeAssignments: enrichAssignments(data).filter((a) => a.personId === personId && a.estat === 'Activa') };
    }

    if (pathname === '/assignments' && method === 'POST') {
      checkRequired(body?.personId, 'persona');
      checkRequired(body?.deviceId, 'dispositiu');
      const person = data.people.find((p) => p.id === body.personId);
      const device = data.devices.find((d) => d.id === body.deviceId);
      if (!person || !device) throwError('Persona o dispositiu no trobats.');

      const deviceActive = data.assignments.find((a) => a.deviceId === device.id && a.estat === 'Activa');
      if (deviceActive) throwError('No es pot assignar un dispositiu que ja té una assignació activa.');

      const returnIds = Array.isArray(body.returnAssignmentIds) ? body.returnAssignmentIds : [];
      const closedAssignments = [];

      for (const assignment of data.assignments) {
        if (assignment.personId === person.id && assignment.estat === 'Activa' && returnIds.includes(assignment.id)) {
          assignment.estat = 'Finalitzada';
          assignment.endedAt = nowIso();
          closedAssignments.push(assignment);
          const returnedDevice = data.devices.find((d) => d.id === assignment.deviceId);
          if (returnedDevice?.estat === 'Entregat') {
            returnedDevice.estat = 'Disponible';
            returnedDevice.updatedAt = nowIso();
            if (TIPUS_ORDINADORS.has(returnedDevice.tipus)) appendEstatLog(data, returnedDevice.sace, 'Disponible');
          }
        }
      }

      const row = {
        id: uid(),
        deviceId: device.id,
        personId: person.id,
        estat: 'Activa',
        startedAt: nowIso(),
        endedAt: null
      };
      data.assignments.push(row);

      device.estat = 'Entregat';
      device.updatedAt = nowIso();
      appendAssignacioLog(data, person.identificador, device.sace);
      if (TIPUS_ORDINADORS.has(device.tipus)) appendEstatLog(data, device.sace, 'Entregat');

      saveData(data);
      return { assignment: row, closedAssignments, logs: data.excelLogs };
    }

    if (pathname === '/incidents' && method === 'GET') {
      return data.incidents.map((i) => ({ ...i, device: data.devices.find((d) => d.id === i.deviceId) || null }));
    }

    if (pathname === '/incidents' && method === 'POST') {
      checkRequired(body?.deviceId, 'dispositiu');
      checkRequired(body?.REQ, 'REQ');
      checkRequired(body?.explicacio, 'explicació');
      const device = data.devices.find((d) => d.id === body.deviceId);
      if (!device) throwError('Dispositiu no trobat.');
      const row = {
        id: uid(),
        deviceId: device.id,
        REQ: body.REQ.trim(),
        explicacio: body.explicacio.trim(),
        estat: body.estat || 'Pendent obrir',
        createdAt: nowIso(),
        updatedAt: nowIso()
      };
      data.incidents.push(row);
      device.estat = 'Pendent de reparació';
      device.updatedAt = nowIso();
      if (TIPUS_ORDINADORS.has(device.tipus)) appendEstatLog(data, device.sace, 'Pendent de reparació');
      saveData(data);
      return row;
    }

    throwError(`Ruta no implementada en mode local: ${method} ${pathname}`, 404);
  } catch (error) {
    if (!error.status) error.status = 400;
    throw error;
  }
}
