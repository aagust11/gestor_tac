import cors from 'cors';
import express from 'express';

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

app.use('/api', api);

app.listen(PORT, () => {
  console.log(`Servidor backend disponible a http://localhost:${PORT}/api`);
});
