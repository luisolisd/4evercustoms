require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { port, nodeEnv, rateLimit: rlCfg, allowedOrigins } = require('./config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');

const app = express();

// Detrás del proxy de Render: usa la IP real del cliente (X-Forwarded-For) para el
// rate limiting. Sin esto, todas las peticiones comparten la IP del proxy y un solo
// "bucket", agotando el límite con los health checks → 429.
app.set('trust proxy', 1);

// ── Health check ──────────────────────────────────────────────────────────────
// Se registra ANTES de cualquier middleware (seguridad, CORS, rate limit, body parser)
// para que SIEMPRE responda 200 cuando la app está viva y NUNCA pueda devolver 429.
// No consulta la base de datos ni depende de servicios externos.
const health = (req, res) => res.status(200).json({ status: 'ok', env: nodeEnv });
app.get('/health', health);
app.get('/healthz', health);

// Security
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido'));
  },
  credentials: true,
}));

// Rate limiting (excluye health checks y preflight CORS como defensa adicional)
app.use(rateLimit({
  windowMs: rlCfg.windowMs,
  max: rlCfg.max,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) =>
    req.method === 'OPTIONS' || req.path === '/health' || req.path === '/healthz',
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
}

// API routes
app.use('/api/v1', routes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }));

// Error handler
app.use(errorHandler);

// Evita que una promesa rechazada sin manejar tumbe el proceso (causa de reinicios).
process.on('unhandledRejection', (reason) =>
  logger.error('unhandledRejection: ' + (reason && reason.message ? reason.message : reason))
);

app.listen(port, () => logger.info(`4EVRcustoms API escuchando en puerto ${port} [${nodeEnv}]`));

module.exports = app;
