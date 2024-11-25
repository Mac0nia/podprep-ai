import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Verify environment setup at startup
const verifyEnvironment = () => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  console.log('Google API Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    apiKeyPresent: !!apiKey,
    searchEngineIdPresent: !!searchEngineId,
    apiKeyFormat: apiKey?.startsWith('AIza') ? 'valid' : 'invalid',
    searchEngineIdFormat: searchEngineId?.length > 10 ? 'valid' : 'invalid'
  });

  // Make a test API call
  const testSearch = async () => {
    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: 'test',
          num: 1
        }
      });
      console.log('API Test successful:', {
        status: response.status,
        quotaInfo: response.headers['x-ratelimit-remaining'] || 'unknown'
      });
    } catch (error: any) {
      console.error('API Test failed:', {
        status: error.response?.status,
        message: error.response?.data?.error?.message || error.message,
        details: error.response?.data?.error?.details || []
      });
    }
  };

  testSearch();
};

// Call verification at startup
verifyEnvironment();

const router = express.Router();

// Validate Google API credentials
const validateCredentials = () => {
  const issues = [];
  if (!process.env.GOOGLE_API_KEY) {
    issues.push('Missing GOOGLE_API_KEY');
  }
  if (!process.env.GOOGLE_SEARCH_ENGINE_ID) {
    issues.push('Missing GOOGLE_SEARCH_ENGINE_ID');
  }
  return issues;
};

router.get('/search', async (req, res) => {
  try {
    const { query, num } = req.query;
    
    // Log incoming request
    console.log('Search request received:', { query, num });
    console.log('Received search request with query:', query);
    
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    // Validate credentials
    const credentialIssues = validateCredentials();
    if (credentialIssues.length > 0) {
      console.error('Credential validation failed:', credentialIssues);
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'API credentials are not properly configured',
        details: credentialIssues
      });
    }

    console.log('Validated credentials, proceeding with API request');

    const searchParams = {
      key: process.env.GOOGLE_API_KEY,
      cx: process.env.GOOGLE_SEARCH_ENGINE_ID,
      q: query,
      num: Number(num) || 10
    };

    // Log request parameters (without sensitive data)
    console.log('Search parameters:', {
      q: searchParams.q,
      num: searchParams.num,
      key: '***',
      cx: typeof searchParams.cx === 'string' ? `${searchParams.cx.substring(0, 5)}...` : 'undefined'
    });

    console.log('Request to Google API made with params:', searchParams);

    try {
      console.log('Making request to Google API...');
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: searchParams,
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json'
        }
      });

      // Log successful response
      console.log('Google API response successful:', {
        status: response.status,
        items: response.data.items?.length || 0
      });

      if (!response.data.items || response.data.items.length === 0) {
        console.log('No items found in Google API response');
      }

      return res.json(response.data);
    } catch (apiError: any) {
      // Enhanced error logging
      console.error('Google API error details:', {
        message: apiError.message,
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        headers: apiError.response?.headers,
        config: {
          url: apiError.config?.url,
          params: {
            ...apiError.config?.params,
            key: '[REDACTED]'
          }
        }
      });

      // Handle specific error cases
      if (apiError.response?.status === 403) {
        const errorDetails = apiError.response?.data?.error || {};
        return res.status(403).json({
          error: 'API Access Error',
          message: errorDetails.message || 'Invalid API key or unauthorized access',
          details: {
            reason: errorDetails.errors?.[0]?.reason || 'unknown',
            domain: errorDetails.errors?.[0]?.domain || 'unknown',
            extendedHelp: errorDetails.errors?.[0]?.extendedHelp || null
          }
        });
      }

      if (apiError.code === 'ECONNABORTED') {
        return res.status(504).json({
          error: 'Timeout Error',
          message: 'The request to Google API timed out',
          details: apiError.message
        });
      }

      // Handle rate limiting
      if (apiError.response?.status === 429) {
        return res.status(429).json({
          error: 'Rate Limit Exceeded',
          message: 'Too many requests. Please try again later.',
          details: apiError.response.data
        });
      }

      // Generic error response
      return res.status(apiError.response?.status || 500).json({
        error: 'Google API Error',
        message: apiError.response?.data?.error?.message || apiError.message,
        details: apiError.response?.data
      });
    }
  } catch (error: any) {
    // Log unexpected errors
    console.error('Unexpected server error:', {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      error: 'Server Error',
      message: 'An unexpected error occurred',
      details: error.message
    });
  }
});

export default router;
