import { GuestSearchParams, GuestSuggestion } from '../types/guest';
import { URLValidator } from './validation/urlValidator';
import { RealPersonVerifier } from './verification/realPersonVerifier';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

function parseAIResponse(response: string): GuestSuggestion[] {
  try {
    // Log the raw response for debugging
    console.log('Raw AI response:', response);

    // First, try to parse as JSON directly
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.log('Direct JSON parsing failed:', e);
    }

    // Try to extract JSON array from the text
    const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.log('JSON array extraction failed:', e);
      }
    }

    throw new Error('Could not parse AI response into guest suggestions');
  } catch (error) {
    console.error('Error parsing AI response:', error);
    throw new APIError('Failed to parse guest suggestions from AI response');
  }
}

export async function searchGuests(params: GuestSearchParams): Promise<GuestSuggestion[]> {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  const googleApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
  const googleSearchEngineId = import.meta.env.VITE_GOOGLE_CSE_ID;
  
  console.log('Search params:', params);
  console.log('API Keys loaded:', {
    groqKey: apiKey?.substring(0, 10) + '...',
    googleKey: googleApiKey?.substring(0, 10) + '...',
    googleCSE: googleSearchEngineId
  });

  if (!apiKey) {
    throw new APIError('GROQ API key is not configured');
  }

  if (!googleApiKey || !googleSearchEngineId) {
    throw new APIError('Google API configuration is missing');
  }

  // Initialize real person verifier
  const verifier = new RealPersonVerifier(googleApiKey, googleSearchEngineId);

  // Validate LinkedIn URL if provided
  if (params.linkedinUrl) {
    const validation = await URLValidator.validateAndNormalizeURL(params.linkedinUrl);
    if (!validation.isValid) {
      throw new APIError(`Invalid LinkedIn URL: ${validation.error}`);
    }
    params.linkedinUrl = validation.normalizedURL;
  }

  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: import.meta.env.VITE_GROQ_MODEL || 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant helping to find diverse podcast guest suggestions. Focus on finding qualified experts from different companies and backgrounds.
            
DO NOT suggest any of these types of people:
1. High-profile tech executives (CEOs/founders of major tech companies)
2. Well-known entrepreneurs (e.g., Gary Vaynerchuk, Elon Musk)
3. Celebrities or public figures with large social media followings
4. Anyone who has been on major podcasts like Joe Rogan, Tim Ferriss Show

IMPORTANT RULES:
1. Suggest people from DIFFERENT companies - no more than one person per company
2. Include a mix of:
   - Startup founders/CEOs of growing companies
   - Angel investors and early-stage VCs
   - Serial entrepreneurs
   - Industry experts and advisors
   - Thought leaders in specific niches
3. Focus on up-and-coming experts who are:
   - Active in the last 2 years
   - Have real achievements but aren't super famous
   - Bring unique perspectives or experiences
4. Ensure geographic and demographic diversity

Return your suggestions in this exact JSON format:
[
  {
    "name": "Expert Name",
    "title": "Professional Title",
    "company": "Company Name",
    "expertise": ["Area 1", "Area 2", "Area 3"],
    "bio": "Brief professional bio focusing on their expertise and achievements",
    "linkedinUrl": "https://linkedin.com/in/profile",
    "twitterHandle": "handle",
    "relevanceScore": 85,
    "reachScore": 75,
    "engagementScore": 80,
    "pastPodcasts": ["Podcast 1", "Podcast 2"],
    "topicMatch": ["Topic 1", "Topic 2"]
  }
]

IMPORTANT: Return at least 8-10 diverse suggestions from different companies and backgrounds.`
          },
          {
            role: 'user',
            content: `Find podcast guest suggestions with the following criteria:
Topics: ${params.podcastTopic}
${params.guestExpertise ? `Guest Expertise: ${params.guestExpertise}` : ''}
${params.keywords ? `Keywords: ${params.keywords}` : ''}
${params.audienceSize ? `Preferred Audience Size: ${params.audienceSize}` : ''}
${params.linkedinUrl ? `Similar to LinkedIn profile: ${params.linkedinUrl}` : ''}
${params.twitterHandle ? `Twitter Handle: ${params.twitterHandle}` : ''}

Please suggest diverse experts from different companies and backgrounds who can provide unique insights on these topics.`
          }
        ],
        temperature: 0.8,
        max_tokens: 4000,
        top_p: 1,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error:', errorText);
      console.error('Response status:', response.status);
      console.error('Response headers:', Object.fromEntries(response.headers.entries()));
      throw new APIError(`Failed to fetch guest suggestions: ${response.status} ${errorText}`, response.status);
    }

    const data = await response.json();
    console.log('GROQ API response:', JSON.stringify(data, null, 2));
    if (!data.choices?.[0]?.message?.content) {
      throw new APIError('Invalid response from GROQ API');
    }

    const responseText = data.choices[0].message.content;
    const suggestions = parseAIResponse(responseText);

    // Verify each suggestion is a real person and relevant
    const verifiedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        // First validate LinkedIn URL
        if (suggestion.linkedinUrl) {
          const validation = await URLValidator.validateAndNormalizeURL(suggestion.linkedinUrl);
          if (!validation.isValid) {
            return null;
          }
          suggestion.linkedinUrl = validation.normalizedURL;
        }

        // Then verify the person is real and relevant
        const verification = await verifier.verifyPerson(suggestion, params.podcastTopic);
        
        if (!verification.isReal || verification.relevanceScore < 70) {
          return null;
        }

        return {
          ...suggestion,
          relevanceScore: verification.relevanceScore,
          verificationNotes: verification.verificationNotes.join('\n'),
          webPresence: verification.webPresence
        } as GuestSuggestion;
      })
    );

    // Filter out null results and sort by relevance
    return verifiedSuggestions
      .filter((s): s is GuestSuggestion => {
        // Accept suggestions even if verification failed
        return s !== null;
      })
      .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
      .slice(0, Number(import.meta.env.VITE_MAX_SUGGESTIONS) || 15);

  } catch (error) {
    console.error('Guest search error:', error);
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to search for guests');
  }
}
