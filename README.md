# Gestor TAC

Estructura base del projecte amb frontend i backend separats, i constants compartides.

## Estructura

- `frontend/`: React + Vite, amb `react-router-dom` i `zustand`.
- `backend/`: Node.js + Express.
- `shared/`: constants de domini en català.

## Requisits

- Node.js 20+
- npm 10+

## Instal·lació

Des de l'arrel:

```bash
npm install
```

Això instal·larà dependències de `frontend` i `backend` via workspaces.

## Execució en local

### Frontend

```bash
npm run dev:frontend
```

- Servei per defecte: `http://localhost:5173`

### Backend

```bash
npm run dev:backend
```

- Servei per defecte: `http://localhost:3000`
- Endpoint salut: `http://localhost:3000/api/health`

### Tots dos serveis

```bash
npm run dev
```

> Aquest script arrenca backend i frontend des de l'arrel.

## CORS i base API

El backend està configurat per acceptar peticions des de:

- `http://localhost:5173`

I publica l'API sota el prefix:

- `/api`
