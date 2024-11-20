import express from 'express';
import { searchGuests } from '../services/ai';
import { GuestSearchSchema } from '../types/guest';

const router = express.Router();

router.post('/search', async (req, res) => {
  try {
    // Validate request body
    const searchParams = GuestSearchSchema.parse(req.body);

    // Search for guests using Groq
    const suggestions = await searchGuests(searchParams);

    // Return response
    res.json({
      suggestions,
      totalResults: suggestions.length,
      page: 1,
      pageSize: suggestions.length
    });
  } catch (error) {
    console.error('Error in guest search:', error);
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Invalid request'
    });
  }
});

export default router;
