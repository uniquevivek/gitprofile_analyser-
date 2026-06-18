import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import profileRoutes from './routes/profileRoutes.js';
import db, { dbType } from './config/database.js';

// Load environmental variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Enable JSON parser
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Register API Routes under /api prefix
app.use('/api', profileRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Simple query to verify database connection health
    let dbStatus = 'healthy';
    try {
      if (dbType === 'sqlite') {
        await db.query('SELECT 1');
      } else {
        await db.query('SELECT 1');
      }
    } catch (dbErr) {
      console.error('Database health check failed:', dbErr.message);
      dbStatus = 'unhealthy';
    }

    res.status(200).json({
      status: 'UP',
      timestamp: new Date().toISOString(),
      database: {
        type: dbType,
        status: dbStatus
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'DOWN',
      error: error.message
    });
  }
});

// Fallback route for SPA - serves index.html for undefined frontend routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start listening
app.listen(PORT, () => {
  console.log('===================================================');
  console.log(`🚀 GitHub Profile Analyzer API server is running!`);
  console.log(`🔌 Port: ${PORT}`);
  console.log(`📂 Database Type: ${dbType.toUpperCase()}`);
  console.log(`🌐 Local URL: http://localhost:${PORT}`);
  console.log('===================================================');
});

export default app;
