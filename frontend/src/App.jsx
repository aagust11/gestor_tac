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

function Layout({ children }) {
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', margin: '1rem auto', maxWidth: 1200 }}>
      <h1>Gestor TAC</h1>
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
  const incidenciesObertes = data.incidents.filter((item) => item.estat === 'Oberta').length;
  const incidenciesPendents = data.incidents.filter((item) => item.estat === 'Pendent obrir').length;
  const perEstat = data.devices.reduce((acc, device) => {
    acc[device.estat] = (acc[device.estat] || 0) + 1;
    return acc;
  }, {});

  return (
    <section>
      <h2>Dashboard</h2>
      <p>Total dispositius: <strong>{data.devices.length}</strong></p>
      <p>Assignacions actives: <strong>{actives}</strong></p>
      <p>Incidències obertes: <strong>{incidenciesObertes}</strong> · pendents: <strong>{incidenciesPendents}</strong></p>
      <h3>Dispositius per estat</h3>
      <ul>
        {Object.entries(perEstat).map(([estat, total]) => <li key={estat}>{estat}: {total}</li>)}
      </ul>
    </section>
  );
}

function Dispositius() {
  const blank = { sace: '', sn: '', tipus: TIPUS_DISPOSITIU[0], estat: ESTATS_DISPOSITIU[0] };
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);

  const load = () => api('/devices').then(setItems);
  useEffect(() => { load(); }, []);

  const filtered = items.filter((item) => [item.sace, item.sn, item.tipus].some((text) => text?.toLowerCase().includes(q.toLowerCase())));

  const submit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api(`/devices/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await api('/devices', { method: 'POST', body: JSON.stringify(form) });
    }
    setForm(blank);
    setEditId(null);
    load();
  };

  const changeState = async (item, estat) => {
    await api(`/devices/${item.id}`, { method: 'PUT', body: JSON.stringify({ ...item, estat }) });
    load();
  };

  return <section>
    <h2>Dispositius</h2>
    <input placeholder="Cerca SACE/SN/tipus" value={q} onChange={(e) => setQ(e.target.value)} />
    <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input required placeholder="SACE" value={form.sace} onChange={(e) => setForm({ ...form, sace: e.target.value })} />
      <input placeholder="SN" value={form.sn} onChange={(e) => setForm({ ...form, sn: e.target.value })} />
      <select value={form.tipus} onChange={(e) => setForm({ ...form, tipus: e.target.value })}>{TIPUS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
      <select value={form.estat} onChange={(e) => setForm({ ...form, estat: e.target.value })}>{ESTATS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
      <button type="submit">{editId ? 'Guardar edició' : 'Alta dispositiu'}</button>
    </form>
    <table border="1" cellPadding="6" style={{ marginTop: 12, width: '100%' }}>
      <thead><tr><th>SACE</th><th>SN</th><th>Tipus</th><th>Estat</th><th>Historial</th><th>Accions</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}>
        <td>{item.sace}</td><td>{item.sn}</td><td>{item.tipus}</td><td>
          <select value={item.estat} onChange={(e) => changeState(item, e.target.value)}>{ESTATS_DISPOSITIU.map((v) => <option key={v}>{v}</option>)}</select>
        </td>
        <td>{item.createdAt?.slice(0, 10)} / {item.updatedAt?.slice(0, 10)}</td>
        <td><button onClick={() => { setEditId(item.id); setForm({ sace: item.sace, sn: item.sn || '', tipus: item.tipus, estat: item.estat }); }}>Editar</button></td>
      </tr>)}</tbody>
    </table>
  </section>;
}

function Persones() {
  const blank = { nom: '', correu: '', identificador: '' };
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [q, setQ] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(blank);
  const load = () => Promise.all([api('/people'), api('/assignments')]).then(([people, ass]) => { setItems(people); setAssignments(ass); });
  useEffect(() => { load(); }, []);

  const activeByPerson = useMemo(() => assignments.filter((a) => a.estat === 'Activa').reduce((acc, row) => {
    acc[row.personId] = (acc[row.personId] || 0) + 1;
    return acc;
  }, {}), [assignments]);

  const filtered = items.filter((item) => [item.nom, item.correu, item.identificador].some((text) => text?.toLowerCase().includes(q.toLowerCase())));

  const submit = async (e) => {
    e.preventDefault();
    if (editId) {
      await api(`/people/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
    } else {
      await api('/people', { method: 'POST', body: JSON.stringify(form) });
    }
    setForm(blank);
    setEditId(null);
    load();
  };

  const remove = async (id) => {
    await api(`/people/${id}`, { method: 'DELETE' });
    load();
  };

  return <section>
    <h2>Persones</h2>
    <input placeholder="Cerca nom/correu/identificador" value={q} onChange={(e) => setQ(e.target.value)} />
    <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <input placeholder="Nom" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
      <input placeholder="Correu" value={form.correu} onChange={(e) => setForm({ ...form, correu: e.target.value })} />
      <input required placeholder="Identificador" value={form.identificador} onChange={(e) => setForm({ ...form, identificador: e.target.value })} />
      <button type="submit">{editId ? 'Guardar edició' : 'Alta persona'}</button>
    </form>
    <table border="1" cellPadding="6" style={{ marginTop: 12, width: '100%' }}>
      <thead><tr><th>Nom</th><th>Correu</th><th>Identificador</th><th>Dispositius actius</th><th>Accions</th></tr></thead>
      <tbody>{filtered.map((item) => <tr key={item.id}>
        <td>{item.nom}</td><td>{item.correu}</td><td>{item.identificador}</td><td>{activeByPerson[item.id] || 0}</td>
        <td><button onClick={() => { setEditId(item.id); setForm({ nom: item.nom || '', correu: item.correu || '', identificador: item.identificador }); }}>Editar</button> <button onClick={() => remove(item.id)}>Eliminar</button></td>
      </tr>)}</tbody>
    </table>
  </section>;
}

function Assignacions() {
  const [people, setPeople] = useState([]);
  const [devices, setDevices] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [form, setForm] = useState({ personId: '', deviceId: '', returnPreviousAssignments: false });
  const [msg, setMsg] = useState('');
  const load = () => Promise.all([api('/people'), api('/devices'), api('/assignments')]).then(([p, d, a]) => { setPeople(p); setDevices(d); setAssignments(a); });
  useEffect(() => { load(); }, []);

  const activeDeviceIds = new Set(assignments.filter((a) => a.estat === 'Activa').map((a) => a.deviceId));

  const submit = async (e) => {
    e.preventDefault();
    const res = await api('/assignments', { method: 'POST', body: JSON.stringify(form) });
    setMsg(`Assignació creada. Tancades: ${res.closedAssignments?.length || 0}`);
    load();
  };

  return <section>
    <h2>Assignacions</h2>
    <form onSubmit={submit} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select required value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
        <option value="">Selecciona persona</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.identificador} - {p.nom}</option>)}
      </select>
      <select required value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
        <option value="">Selecciona dispositiu</option>
        {devices.map((d) => <option key={d.id} value={d.id}>{d.sace} {activeDeviceIds.has(d.id) ? '(ACTIU)' : ''}</option>)}
      </select>
      <label>
        <input type="checkbox" checked={form.returnPreviousAssignments} onChange={(e) => setForm({ ...form, returnPreviousAssignments: e.target.checked })} /> Retornar dispositius previs
      </label>
      <button type="submit">Nova assignació</button>
    </form>
    {msg && <p>{msg}</p>}
    <h3>Avisos dispositius actius</h3>
    <ul>{assignments.filter((a) => a.estat === 'Activa').map((a) => <li key={a.id}>Dispositiu actiu: {devices.find((d) => d.id === a.deviceId)?.sace} · Persona: {people.find((p) => p.id === a.personId)?.identificador}</li>)}</ul>
  </section>;
}

function Incidencies() {
  const [devices, setDevices] = useState([]);
  const [people, setPeople] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [search, setSearch] = useState('');
  const [filterEstat, setFilterEstat] = useState('');
  const [form, setForm] = useState({ deviceId: '', REQ: '', explicacio: '' });

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
    const text = `${d.sace} ${d.sn || ''} ${person?.identificador || ''}`.toLowerCase();
    return text.includes(search.toLowerCase());
  });

  const visibleIncidents = incidents.filter((i) => !filterEstat || i.estat === filterEstat);

  const submit = async (e) => {
    e.preventDefault();
    await api('/incidents', { method: 'POST', body: JSON.stringify(form) });
    setForm({ deviceId: '', REQ: '', explicacio: '' });
    load();
  };

  return <section>
    <h2>Incidències</h2>
    <input placeholder="Cerca dispositiu SACE/SN/persona" value={search} onChange={(e) => setSearch(e.target.value)} />
    <form onSubmit={submit} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <select required value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}>
        <option value="">Dispositiu</option>
        {deviceOptions.map((d) => <option key={d.id} value={d.id}>{d.sace} ({d.sn}) - {people.find((p) => p.id === activeByDevice[d.id])?.identificador || 'sense persona'}</option>)}
      </select>
      <input required placeholder="REQ" value={form.REQ} onChange={(e) => setForm({ ...form, REQ: e.target.value })} />
      <input required placeholder="Explicació" value={form.explicacio} onChange={(e) => setForm({ ...form, explicacio: e.target.value })} />
      <button type="submit">Alta incidència</button>
    </form>

    <h3>Llistat</h3>
    <label>Filtre estat: <select value={filterEstat} onChange={(e) => setFilterEstat(e.target.value)}>
      <option value="">Tots</option>{ESTATS_INCIDENCIA.map((v) => <option key={v}>{v}</option>)}
    </select></label>
    <ul>
      {visibleIncidents.map((inc) => <li key={inc.id}>{devices.find((d) => d.id === inc.deviceId)?.sace} · {inc.REQ} · {inc.estat}</li>)}
    </ul>
  </section>;
}

function Configuracio() {
  const [config, setConfig] = useState({ dataPath: '', assignacionsXlsxPath: '', estatsXlsxPath: '' });
  const [exists, setExists] = useState({});
  const [writeResult, setWriteResult] = useState('');

  const load = () => api('/config').then((data) => {
    setConfig(data.config);
    setExists(data.files);
  });
  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    await api('/config', { method: 'PUT', body: JSON.stringify(config) });
    load();
  };

  const testWrite = async () => {
    try {
      await api('/config/test-write', { method: 'POST' });
      setWriteResult('Escriptura correcta.');
    } catch (error) {
      setWriteResult(error.message);
    }
  };

  return <section>
    <h2>Configuració</h2>
    <form onSubmit={save} style={{ display: 'grid', gap: 8, maxWidth: 700 }}>
      <label>Ruta data.json <input value={config.dataPath} onChange={(e) => setConfig({ ...config, dataPath: e.target.value })} /></label>
      <label>Ruta assignacions.xlsx <input value={config.assignacionsXlsxPath} onChange={(e) => setConfig({ ...config, assignacionsXlsxPath: e.target.value })} /></label>
      <label>Ruta estats.xlsx <input value={config.estatsXlsxPath} onChange={(e) => setConfig({ ...config, estatsXlsxPath: e.target.value })} /></label>
      <button type="submit">Guardar a config.json</button>
    </form>
    <h3>Estat existència</h3>
    <ul>
      {Object.entries(exists).map(([k, v]) => <li key={k}>{k}: {v.exists ? 'Existeix' : 'No existeix'} ({v.resolved})</li>)}
    </ul>
    <button onClick={testWrite}>Prova escriptura</button>
    {writeResult && <p>{writeResult}</p>}
  </section>;
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
