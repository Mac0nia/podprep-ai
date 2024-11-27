import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import guestRoutes from './routes/guest';
import searchRoutes from './routes/search';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/guests', guestRoutes);
app.use('/api', searchRoutes);  // Mount search routes under /api

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'PodPrep AI API Server',
    version: '1.0.0',
    endpoints: {
      search: '/api/search?query=your_search_query',
      guests: '/api/guests',
      health: '/health'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
