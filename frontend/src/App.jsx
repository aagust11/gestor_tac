import { Link, Route, Routes } from 'react-router-dom';
import { useAppStore } from './store';

function Inici() {
  const salutacio = useAppStore((state) => state.salutacio);
  return (
    <main>
      <h1>{salutacio}</h1>
      <p>Frontend inicialitzat amb React + Vite, Router i Zustand.</p>
    </main>
  );
}

function Estat() {
  return <p>Ruta de prova OK.</p>;
}

export default function App() {
  return (
    <>
      <nav>
        <Link to="/">Inici</Link> | <Link to="/estat">Estat</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Inici />} />
        <Route path="/estat" element={<Estat />} />
      </Routes>
    </>
  );
}
