require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./src/routes/auth');
const shipmentRoutes = require('./src/routes/shipments');
const alertRoutes = require('./src/routes/alerts');
const analyticsRoutes = require('./src/routes/analytics');
const { honeypot } = require('./src/middleware/honeypotMiddleware');

const app = express();

app.use(cors());
app.use(express.json());

// Honeypot trap — runs before all routes
app.use(honeypot);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`MargDarshan-AI backend running on port ${PORT}`);
});
