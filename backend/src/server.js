import cors from 'cors';
import express from 'express';

import { loadAndValidateConfig, testWriteAccess } from './services/configService.js';
import { ensureDataFile } from './services/storage.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: 'http://localhost:5173'
  })
);
app.use(express.json());

const api = express.Router();

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

app.use('/api', api);

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
