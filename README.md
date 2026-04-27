# Gestor TAC

Aplicació de gestió TAC amb frontend (React + Vite) i backend (Node.js + Express), orientada a funcionar **en entorn local**.

## Funcionament local i dades (sense internet)

- El sistema està pensat per executar-se a la xarxa/local de centre (`localhost` per defecte).
- El frontend consumeix l'API local del backend a `http://localhost:3000/api`.
- **No depèn d'Internet per al funcionament habitual** (alta/edició/consulta de dades), excepte instal·lació inicial de dependències amb `npm`.
- Les dades es guarden principalment en fitxers locals:
  - `backend/config.json` (configuració de rutes)
  - `backend/data.json` (base de dades JSON local)
  - Fulls Excel configurats a `config.json` (`assignacions.xlsx` i `estats.xlsx`)

## Estructura del projecte

- `frontend/`: aplicació React + Vite.
- `backend/`: API Express i persistència local.
- `shared/`: constants compartides.

## Requisits

- Node.js 20+
- npm 10+

## Instal·lació de dependències

Des de l'arrel del projecte:

```bash
npm install
```

Aquest comandament instal·la les dependències de `frontend` i `backend` (workspaces).

## Arrencar backend i frontend

### Backend

```bash
npm run dev:backend
```

- URL: `http://localhost:3000`
- Salut API: `http://localhost:3000/api/health`

### Frontend

```bash
npm run dev:frontend
```

- URL: `http://localhost:5173`

### Tots dos serveis alhora

```bash
npm run dev
```

## Configurar rutes a `/configuracio`

Un cop backend i frontend estan en marxa:

1. Obre el frontend (`http://localhost:5173`).
2. Ves al menú **Configuració** (ruta `/configuracio`).
3. Omple o revisa:
   - `Ruta data.json`
   - `Ruta assignacions.xlsx`
   - `Ruta estats.xlsx`
4. Prem **Guardar a config.json**.
5. Prem **Prova escriptura** per validar permisos d'accés i escriptura.

> Les rutes relatives es resolen respecte a la carpeta `backend/`.

## Format de `config.json`

Fitxer: `backend/config.json`

Exemple:

```json
{
  "dataPath": "./data.json",
  "assignacionsXlsxPath": "./data/assignacions.xlsx",
  "estatsXlsxPath": "./data/estats.xlsx"
}
```

### Camps obligatoris

- `dataPath` (string no buida): ruta del fitxer de dades JSON.
- `assignacionsXlsxPath` (string no buida): ruta de l'Excel d'assignacions (full `Registre`).
- `estatsXlsxPath` (string no buida): ruta de l'Excel d'estats (full `Registre`).

## Estructura de `data.json`

Fitxer: `backend/data.json`

Estructura base:

```json
{
  "devices": [],
  "people": [],
  "assignments": [],
  "incidents": []
}
```

- `devices`: llista de dispositius.
- `people`: llista de persones.
- `assignments`: llista d'assignacions.
- `incidents`: llista d'incidències.

> Si el fitxer no existeix, el backend el crea automàticament amb aquesta estructura.

## Còpies de seguretat de `data.json`

Es recomana fer còpia abans de canvis importants o actualitzacions.

### Linux/macOS

```bash
cp backend/data.json backend/data.backup.$(date +%Y%m%d_%H%M%S).json
```

### Windows PowerShell

```powershell
Copy-Item backend/data.json "backend/data.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

### Restaurar una còpia

1. Atura backend/frontend.
2. Substitueix el fitxer actual per una còpia:

```bash
cp backend/data.backup.YYYYMMDD_HHMMSS.json backend/data.json
```

3. Torna a arrencar serveis.

## Resolució d'errors habituals

### 1) Errors de permisos (`EACCES`, `EPERM`)

Símptoma habitual:
- Missatges de manca de permisos en provar des de `/configuracio` o en escriure Excel/JSON.

Passos de resolució:
1. Verifica que les rutes de `/configuracio` existeixen i són correctes.
2. Dona permisos d'escriptura a la carpeta/fitxers configurats.
3. Evita rutes dins carpetes protegides del sistema.
4. Reinicia backend i repeteix **Prova escriptura**.

### 2) Fitxer Excel bloquejat (`EBUSY`)

Símptoma habitual:
- Error indicant que el fitxer Excel està bloquejat i no es pot modificar.

Passos de resolució:
1. Tanca el fitxer Excel a Microsoft Excel/LibreOffice/Google Drive Sync.
2. Comprova que no hi hagi un altre usuari o procés utilitzant-lo.
3. Torna a executar l'operació des de l'app.
4. Si persisteix, copia l'Excel a una ruta local no sincronitzada i actualitza `/configuracio`.

## CORS i base API

El backend accepta peticions des de:

- `http://localhost:5173`

I exposa API sota:

- `/api`
