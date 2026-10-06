const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { initDbPool, getPool, getIsPostgresAvailable, getInMemoryStore } = require('./config/db');
const { initializeSchema } = require('./models/schema');

const vmsRouter = require('./routes/vms');
const metricsRouter = require('./routes/metrics');
const alertsRouter = require('./routes/alerts');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/metrics') && req.method === 'POST') {
    // Avoid spamming logs for frequent metrics ingest, but log basic heartbeat
  } else {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  }
  next();
});

// API Routes
app.use('/api/vms', vmsRouter);
app.use('/api/metrics', metricsRouter);
app.use('/api/alerts', alertsRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    postgresConnected: getIsPostgresAvailable(),
    timestamp: new Date().toISOString()
  });
});

// Serve frontend static build if available
const path = require('path');
const fs = require('fs');
const distPath = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Background worker to check for offline VMs (no heartbeat in 30 seconds)
setInterval(async () => {
  try {
    const isPg = getIsPostgresAvailable();
    if (isPg) {
      const pool = getPool();
      await pool.query(`
        UPDATE vms 
        SET status = 'OFFLINE'
        WHERE last_seen < NOW() - INTERVAL '30 seconds'
        AND status NOT IN ('OFFLINE', 'DEREGISTERED')
        AND is_deregistered = FALSE
      `);
    } else {
      const store = getInMemoryStore();
      const cutoff = Date.now() - 30000;
      store.vms.forEach(vm => {
        if (!vm.is_deregistered && vm.status !== 'DEREGISTERED' && new Date(vm.last_seen).getTime() < cutoff) {
          vm.status = 'OFFLINE';
        }
      });
    }
  } catch (err) {
    console.error('Error in offline VM check background worker:', err.message);
  }
}, 5000);

// Initialize DB and launch server
async function startServer() {
  await initDbPool();
  await initializeSchema();

  app.listen(PORT, () => {
    console.log(`🚀 VM Monitoring Backend Server running on http://localhost:${PORT}`);
    console.log(`📡 Ready to receive metrics on http://localhost:${PORT}/api/metrics`);
  });
}

startServer();
