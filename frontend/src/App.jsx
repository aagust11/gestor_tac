import { Link, Route, Routes } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';

const API_BASE = 'http://localhost:3000/api';

const TIPUS_DISPOSITIU = ['Ordinador Alumne', 'Ordinador Docent', 'Tauleta', 'Monitor', 'Altres'];
const ESTATS_DISPOSITIU = ['Per entregar', 'Disponible', 'Entregat', 'Desaparegut', 'Pendent de reparació'];
const ESTATS_INCIDENCIA = ['Pendent obrir', 'Oberta', 'Resolta'];

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: 'Error desconegut' }));
    throw new Error(payload.error ?? 'Error a la crida API');
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function Box({ title, children }) {
  return (
    <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

function ErrorBanner({ error }) {
  if (!error) return null;
  return <p style={{ color: 'crimson', fontWeight: 700 }}>{error}</p>;
}

function Layout({ children }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '1rem auto', maxWidth: 1240 }}>
      <h1>Gestor TAC local</h1>
      <p style={{ marginTop: -6 }}>Aplicació en local amb persistència a fitxers del sistema.</p>
      <nav style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <Link to="/">Dashboard</Link>
        <Link to="/dispositius">Dispositius</Link>
        <Link to="/persones">Persones</Link>
        <Link to="/assignacions">Assignacions</Link>
        <Link to="/incidencies">Incidències</Link>
        <Link to="/configuracio">Configuració</Link>
      </nav>
      {children}
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState({ devices: [], assignments: [], incidents: [] });

  useEffect(() => {
    Promise.all([api('/devices'), api('/assignments'), api('/incidents')]).then(([devices, assignments, incidents]) => {
      setData({ devices, assignments, incidents });
    });
  }, []);

  const actives = data.assignments.filter((item) => item.estat === 'Activa').length;
  const incidenciesActives = data.incidents.filter((item) => ['Oberta', 'Pendent obrir'].includes(item.estat)).length;
  const perEstat = data.devices.reduce((acc, device) => {
    acc[device.estat] = (acc[device.estat] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box title="Dashboard">
      <p>Total dispositius: <strong>{data.devices.length}</strong></p>
      <p>Assignacions actives: <strong>{actives}</strong></p>
      <p>Incidències obertes o pendents: <strong>{incidenciesActives}</strong></p>
      <h3>Dispositius per estat</h3>
      <ul>
        {Object.entries(perEstat).map(([estat, total]) => <li key={estat}>{estat}: {total}</li>)}
      </ul>
    </Box>
  );
}

function Dispositius() {
  const blank = { sace: '', sn: '', tipus: TIPUS_DISPOSITIU[0], estat: ESTATS_DISPOSITIU[0] };
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [selectedHistory, setSelectedHistory] = useState(null);

  const load = () => api('/devices').then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => [item.sace, item.sn, item.tipus].some((text) => text?.toLowerCase().includes(q.toLowerCase())));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await api(`/devices/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await api('/devices', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(blank);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeState = async (item, estat) => {
    setError('');
    try {
      await api(`/devices/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, estat }) });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const loadHistory = async (id) => {
    setError('');
    try {
      const history = await api(`/devices/${id}/history`);
      setSelectedHistory(history);
    } catch (err) {
      setError(err.message);
    }
  };

  return <>
    <Box title="Dispositius">
      <ErrorBanner error={error} />
      <input placeholder="Cerca per SACE, SN o tipus" value={q} onChange={(e) => setQ(e.target.value)} />
      <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input required placeholder="SACE" value={form.sace} onChange={(e) => setForm({ ...form, sace: e.target.value })} />
        <input placeholder="SN" value={form.sn} onChange={(e) => setForm({ ...form, sn: e.target.value })} />
        <select value={form.tipus} onChange={(e) => setForm({ ...form, tipus: e.target.value })}>{TIPUS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
        <select value={form.estat} onChange={(e) => setForm({ ...form, estat: e.target.value })}>{ESTATS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
        <button type="submit">{editId ? 'Guardar edició' : 'Alta dispositiu'}</button>
      </form>
      <table border="1" cellPadding="6" style={{ marginTop: 12, width: '100%' }}>
        <thead><tr><th>SACE</th><th>SN</th><th>Tipus</th><th>Estat</th><th>Accions</th></tr></thead>
        <tbody>{filtered.map((item) => <tr key={item.id}>
          <td>{item.sace}</td><td>{item.sn}</td><td>{item.tipus}</td><td>
            <select value={item.estat} onChange={(e) => changeState(item, e.target.value)}>{ESTATS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
          </td>
          <td>
            <button onClick={() => { setEditId(item.id); setForm({ sace: item.sace, sn: item.sn || '', tipus: item.tipus, estat: item.estat }); }}>Editar</button>{' '}
            <button onClick={() => loadHistory(item.id)}>Historial</button>
          </td>
        </tr>)}</tbody>
      </table>
    </Box>

    {selectedHistory && <Box title={`Historial dispositiu ${selectedHistory.device.sace}`}>
      <h4>Assignacions</h4>
      <ul>
        {selectedHistory.assignments.map((a) => <li key={a.id}>{a.estat} · {a.person?.identificador} · inici {a.startedAt?.slice(0, 10)} · fi {a.endedAt?.slice(0, 10) || '-'}</li>)}
      </ul>
      <h4>Incidències</h4>
      <ul>
        {selectedHistory.incidents.map((i) => <li key={i.id}>{i.REQ} · {i.estat} · {i.explicacio}</li>)}
      </ul>
    </Box>}
  </>;
}

function Persones() {
  const blank = { nom: '', correu: '', identificador: '' };
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');

  const load = () => Promise.all([api('/people'), api('/assignments')]).then(([people, ass]) => {
    setItems(people);
    setAssignments(ass);
  });
  useEffect(() => { load(); }, []);

  const activeByPerson = useMemo(() => assignments.filter((a) => a.estat === 'Activa').reduce((acc, row) => {
    acc[row.personId] = [...(acc[row.personId] || []), row.device?.sace || row.deviceId];
    return acc;
  }, {}), [assignments]);

  const filtered = items.filter((item) => [item.nom, item.correu, item.identificador].some((text) => text?.toLowerCase().includes(q.toLowerCase())));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        await api(`/people/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
      } else {
        await api('/people', { method: 'POST', body: JSON.stringify(form) });
      }
      setForm(blank);
      setEditId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (id) => {
    setError('');
    try {
      await api(`/people/${id}`, { method: 'DELETE' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return <Box title="Persones">
    <ErrorBanner error={error} />
    <input placeholder="Cerca per nom, correu o identificador" value={q} onChange={(e) => setQ(e.target.value)} />
    <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
      <input placeholder="Correu electrònic" value={form.correu} onChange={(e) => setForm({ ...form, correu: e.target.value })} />
      <input required placeholder="Identificador" value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })} />
      <button type="submit">{editId ? 'Guardar edició' : 'Alta persona'}</button>
    </form>
    <table border="1" cellPadding="6" style={{ marginTop: 12, width: '100%' }}>
      <thead><tr><th>Nom</th><th>Correu</th><th>Identificador</th><th>Dispositius actius</th><th>Accions</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}>
        <td>{item.nom}</td><td>{item.correu}</td><td>{item.identificador}</td><td>{(activeByPerson[item.id] || []).join(', ') || 'Cap'}</td>
        <td><button onClick={() => { setEditId(item.id); setForm({ nom: item.nom || '', correu: item.correu || '', identificador: item.identificador }); }}>Editar</button> <button onClick={() => remove(item.id)}>Eliminar</button></td>
      </tr>)}</tbody>
    </table>
  </Box>;
}

function Assignacions() {
  const [peopleSearch, setPeopleSearch] = useState('');
  const [deviceSearch, setDeviceSearch] = useState('');
  const [peopleResults, setPeopleResults] = useState([]);
  const [deviceResults, setDeviceResults] = useState([]);
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [activeAssignments, setActiveAssignments] = useState([]);
  const [returnIds, setReturnIds] = useState([]);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadHistory = () => api('/assignments').then(setHistory);
  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (!peopleSearch.trim()) {
      setPeopleResults([]);
      return;
    }
    api(`/people/search?q=${encodeURIComponent(peopleSearch)}`).then(setPeopleResults).catch(() => setPeopleResults([]));
  }, [peopleSearch]);

  useEffect(() => {
    if (!deviceSearch.trim()) {
      setDeviceResults([]);
      return;
    }
    api(`/devices/search?q=${encodeURIComponent(deviceSearch)}`).then(setDeviceResults).catch(() => setDeviceResults([]));
  }, [deviceSearch]);

  useEffect(() => {
    if (!selectedPerson) {
      setActiveAssignments([]);
      return;
    }

    api('/assignments/preview', {
      method: 'POST',
      body: JSON.stringify({ personId: selectedPerson.id })
    })
      .then((res) => setActiveAssignments(res.activeAssignments || []))
      .catch(() => setActiveAssignments([]));
  }, [selectedPerson]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      if (!selectedPerson || !selectedDevice) {
        throw new Error('Cal seleccionar persona i dispositiu.');
      }

      const res = await api('/assignments', {
        method: 'POST',
        body: JSON.stringify({
          personId: selectedPerson.id,
          deviceId: selectedDevice.id,
          returnAssignmentIds: returnIds
        })
      });

      setMessage(`Assignació creada. Assignacions finalitzades: ${res.closedAssignments?.length || 0}.`);
      setSelectedDevice(null);
      setDeviceSearch('');
      setReturnIds([]);
      loadHistory();
      const preview = await api('/assignments/preview', { method: 'POST', body: JSON.stringify({ personId: selectedPerson.id }) });
      setActiveAssignments(preview.activeAssignments || []);
    } catch (err) {
      setError(err.message);
    }
  };

  return <Box title="Assignacions">
    <ErrorBanner error={error} />
    {message && <p style={{ color: 'green' }}>{message}</p>}

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <h3>Cerca persona</h3>
        <input
          placeholder="Nom, correu o identificador"
          value={peopleSearch}
          onChange={(e) => setPeopleSearch(e.target.value)}
        />
        <ul>
          {peopleResults.map((person) => (
            <li key={person.id}>
              <button onClick={() => setSelectedPerson(person)}>{person.identificador} - {person.nom || '(sense nom)'}</button>
            </li>
          ))}
        </ul>
        <p><strong>Persona seleccionada:</strong> {selectedPerson ? `${selectedPerson.identificador} (${selectedPerson.nom || 'sense nom'})` : 'Cap'}</p>
      </div>

      <div>
        <h3>Cerca dispositiu</h3>
        <input
          placeholder="SACE o SN"
          value={deviceSearch}
          onChange={(e) => setDeviceSearch(e.target.value)}
        />
        <ul>
          {deviceResults.map((device) => (
            <li key={device.id}>
              <button onClick={() => setSelectedDevice(device)}>{device.sace} · {device.sn || '-'} · {device.estat}</button>
            </li>
          ))}
        </ul>
        <p><strong>Dispositiu seleccionat:</strong> {selectedDevice ? `${selectedDevice.sace} (${selectedDevice.sn || '-'})` : 'Cap'}</p>
      </div>
    </div>

    <h3>Dispositius actius de la persona seleccionada</h3>
    {activeAssignments.length === 0 ? <p>Aquesta persona no té cap assignació activa.</p> : (
      <>
        <p>Pots marcar quins dispositius retorna ara:</p>
        <ul>
          {activeAssignments.map((assignment) => (
            <li key={assignment.id}>
              <label>
                <input
                  type="checkbox"
                  checked={returnIds.includes(assignment.id)}
                  onChange={(e) => {
                    setReturnIds((prev) => e.target.checked
                      ? [...prev, assignment.id]
                      : prev.filter((id) => id !== assignment.id));
                  }}
                />{' '}
                {assignment.device?.sace || assignment.deviceId} ({assignment.device?.estat || '-'})
              </label>
            </li>
          ))}
        </ul>
        <p>Si no marques res, l'assignació nova es crea sense retorn de cap dispositiu.</p>
      </>
    )}

    <form onSubmit={submit}>
      <button type="submit">Crear nova assignació</button>
    </form>

    <h3>Historial d'assignacions</h3>
    <table border="1" cellPadding="6" style={{ marginTop: 8, width: '100%' }}>
      <thead><tr><th>Persona</th><th>Dispositiu</th><th>Estat</th><th>Inici</th><th>Fi</th></tr></thead>
      <tbody>
        {history.map((a) => <tr key={a.id}>
          <td>{a.person?.identificador || a.personId}</td>
          <td>{a.device?.sace || a.deviceId}</td>
          <td>{a.estat}</td>
          <td>{a.startedAt?.slice(0, 10)}</td>
          <td>{a.endedAt ? a.endedAt.slice(0, 10) : '-'}</td>
        </tr>)}
      </tbody>
    </table>
  </Box>;
}

function Incidencies() {
  const [devices, setDevices] = useState([]);
  const [people, setPeople] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEstat, setFilterEstat] = useState('');
  const [form, setForm] = useState({ deviceId: '', REQ: '', explicacio: '', estat: 'Pendent obrir' });
  const [error, setError] = useState('');

  const load = () => Promise.all([api('/devices'), api('/people'), api('/assignments'), api('/incidents')]).then(([d, p, a, i]) => {
    setDevices(d); setPeople(p); setAssignments(a); setIncidents(i);
  });
  useEffect(() => { load(); }, []);

  const activeByDevice = assignments.filter((a) => a.estat === 'Activa').reduce((acc, row) => {
    acc[row.deviceId] = row.personId;
    return acc;
  }, {});

  const deviceOptions = devices.filter((d) => {
    const personId = activeByDevice[d.id];
    const person = people.find((p) => p.id === personId);
    const text = `${d.sace} ${d.sn || ''} ${person?.nom || ''} ${person?.identificador || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const visibleIncidents = incidents.filter((i) => !filterEstat || i.estat === filterEstat);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/incidents', { method: 'POST', body: JSON.stringify(form) });
      setForm({ deviceId: '', REQ: '', explicacio: '', estat: 'Pendent obrir' });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return <Box title="Incidències">
    <ErrorBanner error={error} />
    <input placeholder="Cerca dispositiu per SACE, SN o persona assignada" value={search} onChange={(e) => setSearch(e.target.value)} />
    <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select required value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
        <option value="">Dispositiu</option>
        {deviceOptions.map((d) => <option key={d.id} value={d.id}>{d.sace} ({d.sn}) - {people.find((p) => p.id === activeByDevice[d.id])?.identificador || 'sense persona'}</option>)}
      </select>
      <input required placeholder="REQ" value={form.REQ} onChange={(e) => setForm({ ...form, REQ: e.target.value })} />
      <input required placeholder="Explicació" value={form.explicacio} onChange={(e) => setForm({ ...form, explicacio: e.target.value })} />
      <select value={form.estat} onChange={(e) => setForm({ ...form, estat: e.target.value })}>
        {ESTATS_INCIDENCIA.map((v) => <option key={v}>{v}</option>)}
      </select>
      <button type="submit">Alta incidència</button>
    </form>

    <h3>Llistat i filtres</h3>
    <label>Filtre estat: <select value={filterEstat} onChange={(e) => setFilterEstat(e.target.value)}>
      <option value="">Tots</option>{ESTATS_INCIDENCIA.map((v) => <option key={v}>{v}</option>)}
    </select></label>
    <ul>
      {visibleIncidents.map((inc) => <li key={inc.id}>{inc.device?.sace || devices.find((d) => d.id === inc.deviceId)?.sace} · {inc.REQ} · {inc.estat} · {inc.explicacio}</li>)}
    </ul>
  </Box>;
}

function Configuracio() {
  const [config, setConfig] = useState({ dataPath: '', assignacionsXlsxPath: '', estatsXlsxPath: '' });
  const [exists, setExists] = useState({});
  const [writeResult, setWriteResult] = useState('');
  const [error, setError] = useState('');

  const load = () => api('/config').then((data) => {
    setConfig(data.config);
    setExists(data.files);
  });
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api('/config', { method: 'PUT', body: JSON.stringify(config) });
      setWriteResult('Configuració guardada correctament.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const testWrite = async () => {
    setError('');
    try {
      await api('/config/test-write', { method: 'POST' });
      setWriteResult('Prova d\'escriptura correcta als fitxers configurats.');
    } catch (err) {
      setError(err.message);
      setWriteResult('');
    }
  };

  return <Box title="Configuració">
    <ErrorBanner error={error} />
    <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 860 }}>
      <label>Ruta local de data.json <input value={config.dataPath} onChange={(e) => setConfig({ ...config, dataPath: e.target.value })} /></label>
      <label>Ruta local de indic_assignacions.xlsx <input value={config.assignacionsXlsxPath} onChange={(e) => setConfig({ ...config, assignacionsXlsxPath: e.target.value })} /></label>
      <label>Ruta local de indic_estats.xlsx <input value={config.estatsXlsxPath} onChange={(e) => setConfig({ ...config, estatsXlsxPath: e.target.value })} /></label>
      <button type="submit">Guardar a config.json</button>
    </form>
    <h3>Comprovació d'existència de rutes</h3>
    <ul>
      {Object.entries(exists).map(([k, v]) => <li key={k}>{k}: {v.exists ? 'Existeix' : 'No existeix'} ({v.resolved})</li>)}
    </ul>
    <button onClick={testWrite}>Provar escriptura</button>
    {writeResult && <p style={{ color: 'green' }}>{writeResult}</p>}
  </Box>;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dispositius" element={<Dispositius />} />
        <Route path="/persones" element={<Persones />} />
        <Route path="/assignacions" element={<Assignacions />} />
        <Route path="/incidencies" element={<Incidencies />} />
        <Route path="/configuracio" element={<Configuracio />} />
      </Routes>
    </Layout>
  );
}
