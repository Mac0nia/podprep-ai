import express from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Common headers for Google API requests
const googleApiHeaders = {
  'Accept': 'application/json',
  'Referer': 'http://localhost:3000',
  'Origin': 'http://localhost:3000'
};

// Verify environment setup at startup
const verifyEnvironment = () => {
  const apiKey: string | undefined = process.env.GOOGLE_API_KEY;
  const searchEngineId: string | undefined = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  console.log('Google API Configuration:', {
    NODE_ENV: process.env.NODE_ENV,
    apiKeyPresent: !!apiKey,
    searchEngineIdPresent: !!searchEngineId,
    apiKeyFormat: typeof apiKey === 'string' && apiKey.startsWith('AIza') ? 'valid' : 'invalid',
    searchEngineIdFormat: typeof searchEngineId === 'string' && searchEngineId.length >= 10 ? 'valid' : 'invalid'
  });

  // Make a test API call
  const testSearch = async () => {
    if (!apiKey || !searchEngineId) {
      console.error('Missing required credentials');
      return;
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        headers: googleApiHeaders,
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
  const apiKey: string | undefined = process.env.GOOGLE_API_KEY;
  const searchEngineId: string | undefined = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  const issues: string[] = [];
  
  // Validate API Key
  if (typeof apiKey !== 'string' || !apiKey) {
    issues.push('Missing GOOGLE_API_KEY');
  } else if (!apiKey.startsWith('AIza')) {
    issues.push('Invalid GOOGLE_API_KEY format');
  }
  
  // Validate Search Engine ID
  if (typeof searchEngineId !== 'string' || !searchEngineId) {
    issues.push('Missing GOOGLE_SEARCH_ENGINE_ID');
  } else if (searchEngineId.trim().length < 10) {
    issues.push('Invalid GOOGLE_SEARCH_ENGINE_ID format');
  }
  
  return issues;
};

interface SearchFilters {
  expertise?: string[];
  experienceLevel?: 'beginner' | 'intermediate' | 'expert';
  mediaPresence?: boolean;
  location?: string;
  language?: string[];
  topicAreas?: string[];
  availabilityRequired?: boolean;
  podcastExperience?: boolean;
  reachMetrics?: {
    minFollowers?: number;
    platforms?: string[];
  };
  timeframe?: {
    start?: Date;
    end?: Date;
  };
}

interface SearchOptions {
  sortBy?: 'relevance' | 'experience' | 'reach' | 'availability';
  limit?: number;
  excludePrevious?: boolean;
  preferVerified?: boolean;
}

// Parse natural language search query into structured filters
const parseSearchQuery = (query: string): { 
  baseQuery: string, 
  filters: SearchFilters,
  options: SearchOptions 
} => {
  const filters: SearchFilters = {};
  const options: SearchOptions = {};
  let baseQuery = query;

  // Extract expertise levels
  const expertiseMatch = query.match(/\b(beginner|intermediate|expert)\b/i);
  if (expertiseMatch) {
    filters.experienceLevel = expertiseMatch[1].toLowerCase() as 'beginner' | 'intermediate' | 'expert';
    baseQuery = baseQuery.replace(expertiseMatch[0], '');
  }

  // Extract location preferences
  const locationMatch = query.match(/\bin|from|near\s+([^,]+(?:,\s*[^,]+)?)/i);
  if (locationMatch) {
    filters.location = locationMatch[1].trim();
    baseQuery = baseQuery.replace(locationMatch[0], '');
  }

  // Extract language requirements
  const languageMatch = query.match(/\bspeaks?\s+([^,]+(?:,\s*[^,]+)*)/i);
  if (languageMatch) {
    filters.language = languageMatch[1].split(',').map(lang => lang.trim());
    baseQuery = baseQuery.replace(languageMatch[0], '');
  }

  // Extract topic areas
  const topicMatch = query.match(/\babout|on\s+([^,]+(?:,\s*[^,]+)*)/i);
  if (topicMatch) {
    filters.topicAreas = topicMatch[1].split(',').map(topic => topic.trim());
    baseQuery = baseQuery.replace(topicMatch[0], '');
  }

  // Extract media presence requirements
  if (/\b(?:has been on|appeared on|featured in)\b/i.test(query)) {
    filters.mediaPresence = true;
    baseQuery = baseQuery.replace(/\b(?:has been on|appeared on|featured in)\b/i, '');
  }

  // Extract podcast experience requirement
  if (/\bpodcast experience\b/i.test(query)) {
    filters.podcastExperience = true;
    baseQuery = baseQuery.replace(/\bpodcast experience\b/i, '');
  }

  // Extract reach metrics
  const followersMatch = query.match(/\b(\d+)\+?\s*(?:followers|subscribers)\b/i);
  if (followersMatch) {
    filters.reachMetrics = {
      minFollowers: parseInt(followersMatch[1]),
      platforms: []
    };
    baseQuery = baseQuery.replace(followersMatch[0], '');
  }

  // Extract platform preferences
  const platformMatch = query.match(/\bon\s+(twitter|linkedin|instagram|youtube)(?:\s+and\s+(twitter|linkedin|instagram|youtube))*/i);
  if (platformMatch) {
    if (!filters.reachMetrics) filters.reachMetrics = { platforms: [] };
    filters.reachMetrics.platforms = Array.from(new Set(platformMatch[0].match(/twitter|linkedin|instagram|youtube/gi)));
    baseQuery = baseQuery.replace(platformMatch[0], '');
  }

  // Extract availability requirement
  if (/\bavailable|taking bookings\b/i.test(query)) {
    filters.availabilityRequired = true;
    baseQuery = baseQuery.replace(/\bavailable|taking bookings\b/i, '');
  }

  // Extract sorting preferences
  if (/\bmost relevant\b/i.test(query)) options.sortBy = 'relevance';
  if (/\bmost experienced\b/i.test(query)) options.sortBy = 'experience';
  if (/\blargest reach|biggest following\b/i.test(query)) options.sortBy = 'reach';
  if (/\bsoonest available\b/i.test(query)) options.sortBy = 'availability';

  // Extract other options
  if (/\bexclude previous guests\b/i.test(query)) options.excludePrevious = true;
  if (/\bverified only\b/i.test(query)) options.preferVerified = true;

  // Clean up base query
  baseQuery = baseQuery.trim().replace(/\s+/g, ' ');

  return { baseQuery, filters, options };
};

// Enhance search query with filters and options
const enhanceQuery = async (query: string): Promise<string> => {
  const { baseQuery, filters, options } = parseSearchQuery(query);
  
  // Build enhanced query parts
  const queryParts: string[] = [baseQuery];

  // Add expertise level context
  if (filters.experienceLevel) {
    queryParts.push(`${filters.experienceLevel} level`);
  }

  // Add topic expertise
  if (filters.topicAreas?.length) {
    queryParts.push(`expert in ${filters.topicAreas.join(' ')}`);
  }

  // Add media presence indicators
  if (filters.mediaPresence) {
    queryParts.push('featured speaker presenter podcast guest');
  }

  // Add location context
  if (filters.location) {
    queryParts.push(`located in ${filters.location}`);
  }

  // Add platform presence
  if (filters.reachMetrics?.platforms?.length) {
    queryParts.push(`active on ${filters.reachMetrics.platforms.join(' ')}`);
  }

  // Add professional indicators
  queryParts.push('professional speaker expert thought leader');

  // Combine all parts
  const enhancedQuery = queryParts
    .filter(Boolean)
    .join(' ')
    .trim()
    .replace(/\s+/g, ' ');

  return enhancedQuery;
};

// Example search query builder for the frontend
const buildSearchExample = (): string[] => [
  'AI experts in Silicon Valley with podcast experience',
  'experienced founders who speak about entrepreneurship',
  'sustainability experts available for booking',
  'tech leaders with 10k+ followers on LinkedIn',
  'psychology experts who speak English and Spanish',
  'blockchain developers in Europe with speaking experience',
  'female CEOs in healthcare industry',
  'authors who speak about leadership, verified only',
  'startup founders with most podcast appearances',
  'AI researchers taking podcast bookings, exclude previous guests'
];

router.get('/search', async (req, res) => {
  try {
    const { query, num = '10' } = req.query;
    
    // Input validation
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'Query parameter must be a non-empty string'
      });
    }

    // Validate credentials
    const credentialIssues = validateCredentials();
    if (credentialIssues.length > 0) {
      console.error('Google Search API credential validation failed:', credentialIssues);
      return res.status(500).json({
        error: 'Configuration error',
        message: 'Search service is not properly configured',
        details: credentialIssues
      });
    }

    const apiKey = process.env.GOOGLE_API_KEY;
    const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error('API credentials are not properly configured');
    }

    // Configure search request
    const searchUrl = 'https://www.googleapis.com/customsearch/v1';
    
    // Enhance query for podcast guest relevance
    const enhancedQuery = await enhanceQuery(query as string);

    // Function to search for podcast appearances
    const searchPodcastAppearances = async (guestName: string) => {
      try {
        const podcastQuery = `${guestName} (podcast OR interview OR episode) site:podcasts.apple.com OR site:spotify.com/episode OR site:listennotes.com`;
        const podcastResponse = await axios.get(searchUrl, {
          params: {
            key: apiKey,
            cx: searchEngineId,
            q: podcastQuery,
            num: 5, // Limit to top 5 appearances
            dateRestrict: 'y2' // Last 2 years
          }
        });

        return (podcastResponse.data.items || []).map((item: any) => ({
          title: item.title,
          podcastUrl: item.link,
          description: item.snippet,
          date: item.pagemap?.metatags?.[0]?.['og:published_time'] || null,
          platform: item.link.includes('apple.com') ? 'Apple Podcasts' :
                   item.link.includes('spotify.com') ? 'Spotify' :
                   item.link.includes('listennotes.com') ? 'Listen Notes' : 'Other'
        }));
      } catch (error) {
        console.error('Error fetching podcast appearances:', error);
        return [];
      }
    };

    const params = {
      key: apiKey,
      cx: searchEngineId,
      q: enhancedQuery,
      num: Math.min(Number(num), 10),
      personalization: 'enabled',
      dateRestrict: 'y1',
      sort: 'date:r:20230101:20240101'
    };

    console.log('Initiating Google Search API request:', {
      url: searchUrl,
      query: params.q,
      num: params.num
    });

    // Make the API request
    const response = await axios.get(searchUrl, { params });

    // Process and enrich search results
    const processResults = async (results: any[]) => {
      // Process results in parallel using Promise.all
      const processedResults = await Promise.all(results.map(async result => {
        const {title, link, snippet} = result;
        
        // Extract name from title or snippet
        const extractName = (text: string) => {
          // Basic name extraction - can be improved with NLP
          const nameMatch = text.match(/^([A-Z][a-z]+ (?:[A-Z][a-z]+ )?[A-Z][a-z]+)/);
          return nameMatch ? nameMatch[1] : text.split(/[-–|]/)[0].trim();
        };

        const guestName = extractName(title);
        
        // Extract LinkedIn URL from snippet or link
        const linkedInUrl = (snippet + ' ' + link).match(/linkedin\.com\/in\/[\w-]+/i)?.[0];

        // Verify identity and LinkedIn profile
        const verifiedIdentity = await verifyIdentityAndLinkedIn({
          name: guestName,
          title,
          snippet,
          linkedInUrl: linkedInUrl ? `https://www.${linkedInUrl}` : undefined
        });

        // Only fetch podcast appearances if identity is verified
        const podcastAppearances = verifiedIdentity.identityScore >= 0.5 ?
          await searchPodcastAppearances(verifiedIdentity.verifiedName) : [];

        // Evaluate podcast guest quality factors
        const evaluateGuestQuality = async (guestInfo: any) => {
          const { title, snippet, podcastAppearances, verifiedIdentity } = guestInfo;
          const fullText = `${title} ${snippet}`;
          
          // Speaking and Communication Skills
          const speakingFactors = {
            publicSpeaking: /(?:speaker|keynote|presenter|talk|conference|stage)/i.test(fullText) ? 2 : 0,
            teachingAbility: /(?:teach|instructor|professor|coach|mentor|workshop)/i.test(fullText) ? 1.5 : 0,
            storytelling: /(?:story|author|writer|blog|article|contributor)/i.test(fullText) ? 1.5 : 0
          };

          // Expertise and Authority
          const expertiseFactors = {
            industryLeader: /(?:founder|ceo|president|director|leader|pioneer)/i.test(fullText) ? 2 : 0,
            subjectMatter: /(?:expert|specialist|authority|thought leader|innovator)/i.test(fullText) ? 2 : 0,
            credentials: /(?:phd|award|certification|degree|published|patent)/i.test(fullText) ? 1.5 : 0
          };

          // Media Experience
          const mediaFactors = {
            podcastHistory: Math.min(podcastAppearances.length * 0.5, 2), // Up to 2 points for podcast experience
            mediaPresence: /(?:featured in|quoted in|appeared on|interview|media)/i.test(fullText) ? 1 : 0,
            onlineEngagement: calculateOnlineEngagement(guestInfo)
          };

          // Unique Value Proposition
          const uniqueFactors = {
            innovativeWork: /(?:innovation|breakthrough|revolutionary|unique|pioneering)/i.test(fullText) ? 1.5 : 0,
            currentRelevance: /(?:current|trending|emerging|latest|future|upcoming)/i.test(fullText) ? 1 : 0,
            controversy: /(?:controversy|debate|challenge|dispute|revolution)/i.test(fullText) ? 0.5 : 0
          };

          // Audience Engagement Potential
          const audienceFactors = {
            practicalValue: /(?:how to|tips|strategy|practical|actionable|implement)/i.test(fullText) ? 1.5 : 0,
            inspirational: /(?:inspire|motivate|transform|change|impact|success)/i.test(fullText) ? 1 : 0,
            relatable: /(?:journey|experience|story|challenge|overcome|learn)/i.test(fullText) ? 1 : 0
          };

          // Calculate podcast performance score from previous appearances
          const podcastPerformance = await analyzePodcastPerformance(podcastAppearances);

          // Calculate final scores
          const scores = {
            speakingAbility: Object.values(speakingFactors).reduce((a, b) => a + b, 0),
            expertise: Object.values(expertiseFactors).reduce((a, b) => a + b, 0),
            mediaPresence: Object.values(mediaFactors).reduce((a, b) => a + b, 0),
            uniqueValue: Object.values(uniqueFactors).reduce((a, b) => a + b, 0),
            audienceEngagement: Object.values(audienceFactors).reduce((a, b) => a + b, 0),
            podcastPerformance: podcastPerformance
          };

          // Generate guest insights
          const insights = generateGuestInsights(scores, {
            speakingFactors,
            expertiseFactors,
            mediaFactors,
            uniqueFactors,
            audienceFactors
          });

          return {
            qualityScore: calculateOverallScore(scores),
            scores,
            insights,
            recommendedTopics: generateTopicSuggestions(guestInfo),
            guestStrengths: identifyGuestStrengths(scores),
            redFlags: identifyRedFlags(guestInfo),
            bookingPriority: determineBookingPriority(scores)
          };
        };

        // Calculate online engagement score
        const calculateOnlineEngagement = (guestInfo: any) => {
          let score = 0;
          const { socialLinks } = guestInfo;

          // Award points for active social media presence
          if (socialLinks.linkedin) score += 0.5;
          if (socialLinks.twitter) score += 0.5;
          if (socialLinks.instagram) score += 0.5;

          return Math.min(score, 1.5); // Cap at 1.5 points
        };

        // Analyze previous podcast performance
        const analyzePodcastPerformance = async (appearances: any[]) => {
          if (!appearances.length) return 0;

          let score = 0;
          // Award points for:
          // - Recent appearances (within last year)
          // - High-profile podcasts
          // - Variety of topics
          // - Consistent appearances
          const recentAppearances = appearances.filter(a => 
            new Date(a.date).getTime() > Date.now() - 365 * 24 * 60 * 60 * 1000
          ).length;

          score += Math.min(recentAppearances * 0.5, 1.5); // Up to 1.5 for recent activity
          score += appearances.length > 3 ? 1 : appearances.length * 0.3; // Experience points
          
          return Math.min(score, 2.5); // Cap at 2.5 points
        };

        // Generate insights about the guest
        const generateGuestInsights = (scores: any, factors: any) => {
          const insights = [];
          
          // Speaking Ability Insights
          if (scores.speakingAbility > 3) {
            insights.push("Excellent communicator with proven speaking experience");
          } else if (scores.speakingAbility > 1.5) {
            insights.push("Competent speaker with some public speaking experience");
          }

          // Expertise Insights
          if (scores.expertise > 4) {
            insights.push("Industry leader with strong authority in their field");
          } else if (scores.expertise > 2) {
            insights.push("Knowledgeable expert with valuable insights");
          }

          // Media Experience Insights
          if (scores.mediaPresence > 3) {
            insights.push("Experienced media personality with podcast presence");
          } else if (scores.mediaPresence > 1.5) {
            insights.push("Has some media experience and can handle interviews");
          }

          return insights;
        };

        // Generate topic suggestions based on guest's background
        const generateTopicSuggestions = (guestInfo: any) => {
          const { verifiedIdentity, snippet } = guestInfo;
          const topics = new Set<string>();

          // Add topics based on expertise
          verifiedIdentity.expertise.forEach((exp: string) => topics.add(exp));

          // Add topics based on roles and experience
          verifiedIdentity.roles.forEach((role: string) => {
            if (role.includes('founder')) topics.add('Entrepreneurship');
            if (role.includes('ceo')) topics.add('Leadership');
            // Add more role-based topics
          });

          return Array.from(topics);
        };

        // Identify guest's key strengths
        const identifyGuestStrengths = (scores: any) => {
          const strengths = [];
          if (scores.speakingAbility > 3) strengths.push("Strong Public Speaker");
          if (scores.expertise > 4) strengths.push("Industry Authority");
          if (scores.mediaPresence > 3) strengths.push("Media Savvy");
          if (scores.uniqueValue > 2) strengths.push("Unique Perspective");
          if (scores.audienceEngagement > 2.5) strengths.push("Highly Engaging");
          return strengths;
        };

        // Identify potential red flags
        const identifyRedFlags = (guestInfo: any) => {
          const redFlags = [];
          if (guestInfo.podcastAppearances.length === 0) {
            redFlags.push("No previous podcast experience");
          }
          if (!guestInfo.verifiedIdentity.verifiedLinkedIn) {
            redFlags.push("Unable to verify professional background");
          }
          return redFlags;
        };

        // Determine booking priority
        const determineBookingPriority = (scores: any) => {
          const totalScore = calculateOverallScore(scores);
          if (totalScore > 15) return "High Priority";
          if (totalScore > 10) return "Medium Priority";
          return "Low Priority";
        };

        // Calculate overall quality score
        const calculateOverallScore = (scores: any) => {
          return (
            scores.speakingAbility * 1.5 +    // 30%
            scores.expertise * 1.5 +          // 30%
            scores.mediaPresence * 1.0 +      // 20%
            scores.uniqueValue * 0.5 +        // 10%
            scores.audienceEngagement * 0.5   // 10%
          );
        };

        // Add guest quality assessment
        const guestQuality = await evaluateGuestQuality({
          ...result,
          verifiedIdentity,
          podcastAppearances
        });

        return {
          ...result,
          verifiedIdentity,
          podcastAppearances,
          guestQuality
        };
      }));

      return processedResults
        .filter(result => result.verifiedIdentity.identityScore >= 0.5)
        .sort((a, b) => b.guestQuality.qualityScore - a.guestQuality.qualityScore);
    };

    // Process and return enhanced results
    const enhancedResults = await processResults(response.data.items || []);
    
    return res.json({
      ...response.data,
      items: enhancedResults
    });
  } catch (error: any) {
    // Enhanced error logging
    console.error('Google Search API request failed:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      message: error.response?.data?.error?.message,
      details: error.response?.data?.error?.details,
      headers: {
        referer: req.headers.referer,
        origin: req.headers.origin
      },
      config: {
        url: error.config?.url,
        params: error.config?.params,
        headers: error.config?.headers
      }
    });

    return res.status(error.response?.status || 500).json({
      error: 'Search request failed',
      message: error.response?.data?.error?.message || error.message,
      details: error.response?.data?.error?.details || [],
      status: error.response?.status
    });
  }
});

export default router;
