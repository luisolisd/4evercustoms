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

// Security
app.use(helmet());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('CORS: origen no permitido'));
  },
  credentials: true,
}));

// Rate limiting
app.use(rateLimit({ windowMs: rlCfg.windowMs, max: rlCfg.max }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging
if (nodeEnv !== 'test') {
  app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
}

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: nodeEnv }));

// API routes
app.use('/api/v1', routes);

// 404
app.use((req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada' }));

// Error handler
app.use(errorHandler);

app.listen(port, () => logger.info(`4EVRcustoms API escuchando en puerto ${port} [${nodeEnv}]`));

module.exports = app;
