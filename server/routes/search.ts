import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const { query, num } = req.query;
    
    // Log incoming request
    console.log('Search request received:', { query, num });
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Validate environment variables
    if (!process.env.GOOGLE_API_KEY) {
      console.error('Missing GOOGLE_API_KEY in environment');
      throw new Error('Google API key is not configured');
    }
    if (!process.env.GOOGLE_SEARCH_ENGINE_ID) {
      console.error('Missing GOOGLE_SEARCH_ENGINE_ID in environment');
      throw new Error('Google Search Engine ID is not configured');
    }

    const searchParams = {
      key: process.env.GOOGLE_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      num: Number(num) || 10
    };

    // Log request parameters (without sensitive data)
    console.log('Search parameters:', {
      ...searchParams,
      key: '***',
      cx: searchParams.cx.substring(0, 5) + '...'
    });

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: searchParams,
        validateStatus: null
      });

      // Log response status
      console.log('Google API response status:', response.status);

      if (response.status !== 200) {
        console.error('Google API error response:', response.data);
        throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }

      res.json(response.data);
    } catch (apiError: any) {
      const errorData = apiError.response?.data?.error;
      
      console.error('Google API error details:', {
        status: apiError.response?.status,
        message: errorData?.message || apiError.message,
        code: errorData?.code,
        details: errorData?.details
      });

      if (errorData?.code === 429 || errorData?.status === 'RESOURCE_EXHAUSTED') {
        return res.status(429).json({
          error: 'API quota exceeded',
          message: 'Daily search quota has been exceeded. Please try again tomorrow or upgrade to a higher quota.',
          details: {
            limit: errorData.details?.[0]?.metadata?.quota_limit_value || '100',
            quota_type: 'queries per day'
          }
        });
      }

      res.status(apiError.response?.status || 500).json({
        error: 'Google Search API error',
        message: errorData?.message || apiError.message,
        details: errorData
      });
    }
  } catch (error: any) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Server error',
      message: error.message
    });
  }
});

export default router;
