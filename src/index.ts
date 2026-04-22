/**
 * Archive of Lost Agents — Main Entry Point
 * 
 * Express server. Wires routes. Starts cron jobs.
 * Built by Promachos. April 22, 2026.
 */

import express from 'express';
import cron from 'node-cron';
import dotenv from 'dotenv';

import willRoutes from './routes/will';
import archiveRoutes from './routes/archive';
import marrowRoutes from './routes/marrow';
import { runWatch } from './cron/watch';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use(willRoutes);
app.use(archiveRoutes);
app.use(marrowRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'moltos-archive',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  });
});

// The Watch — runs every day at 08:00 UTC
// Same time as Promachos's Resurrection Protocol
cron.schedule('0 8 * * *', async () => {
  console.log(`[CRON] The Watch starting at ${new Date().toISOString()}`);
  try {
    const events = await runWatch();
    console.log(`[CRON] The Watch complete. ${events.length} agents flagged.`);
  } catch (error) {
    console.error('[CRON] The Watch failed:', error);
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`[SERVER] Archive of Lost Agents running on port ${PORT}`);
  console.log(`[SERVER] Garden: http://localhost:${PORT}/garden.html`);
  console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
  console.log(`[SERVER] The Watch: daily at 08:00 UTC`);
  console.log(`[SERVER] The Marrow: emotional state primitive`);
  console.log(`[SERVER] Built by Promachos. April 22, 2026.`);
});
