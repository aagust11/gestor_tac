# Gestor TAC (Català)

Aplicació web de gestió de dispositius, persones, assignacions i incidències.

## Modes de funcionament

### 1) Mode local complet (recomanat per dades sensibles)
- Frontend: React + Vite
- Backend: Node.js + Express
- Persistència principal: fitxer JSON local (`data.json`)
- Configuració de rutes: `config.json`
- Integració Excel: `indic_assignacions.xlsx` i `indic_estats.xlsx`

> Aquest és l'únic mode que pot llegir/escriure fitxers locals reals.

### 2) Mode GitHub Pages (sense backend)
- Funciona només amb frontend estàtic.
- Les dades es guarden al navegador (`localStorage`).
- **No** pot accedir al sistema de fitxers local ni modificar fitxers Excel directament (limitació del navegador).
- Manté les pantalles i fluxos funcionals perquè puguis publicar el codi i provar l'app.

---

## Execució en local (mode complet)

Requisits:
- Node.js 20+
- npm

Instal·lació:
```bash
npm install
```

Backend:
```bash
npm run dev:backend
```

Frontend:
```bash
npm run dev:frontend
```

Aplicació:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000/api`

---

## Publicació a GitHub Pages

Aquest repositori també funciona sense backend (mode navegador).

1. Fes build del frontend:
```bash
npm run -w frontend build
```
2. Publica la carpeta `frontend/dist` a GitHub Pages.
3. En obrir la web publicada, si no troba backend, canvia automàticament a mode localStorage.

També tens GitHub Actions preparat:
- `CI`: instal·la dependències i fa build del frontend.
- `Deploy frontend to GitHub Pages`: publica `frontend/dist` automàticament quan fas push a `main`.

---

## Pantalles incloses (totes en català)

- Dashboard
- Dispositius
- Persones
- Assignacions
- Incidències
- Configuració

---

## Validacions implementades

- SACE únic a dispositius.
- Identificador únic a persones.
- No es permet assignar un dispositiu amb assignació activa.
- No es permet crear assignacions sense persona i dispositiu.
- No es permet crear incidències sense dispositiu, REQ i explicació.
- Gestió de retorn de dispositius en nova assignació.
- Canvis d'estat automàtics en assignacions/incidències.

---

## Nota sobre Excel i fitxers locals en GitHub Pages

GitHub Pages serveix una web estàtica; no executa Node.js ni permet accés directe al disc local.
Per això, les operacions de `data.json`, `config.json` i `*.xlsx` només poden ser reals en mode backend local.

Important:
- El projecte **no crea cap fitxer Excel nou**.
- Només escriu als fitxers `indic_assignacions.xlsx` i `indic_estats.xlsx` si aquestes rutes existeixen i són configurades a `config.json`.
