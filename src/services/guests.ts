import { GuestSearchParams, GuestSuggestion } from '../types/guest';
import { URLValidator } from './validation/urlValidator';

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

function parseAIResponse(response: string): GuestSuggestion[] {
  try {
    // First, try to parse as JSON directly
    try {
      const parsed = JSON.parse(response);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      // If direct parsing fails, continue with text parsing
    }

    // Extract JSON-like structures from the text
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        return parsed;
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
  
  if (!apiKey) {
    throw new APIError('GROQ API key is not configured');
  }

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
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: `You are a podcast guest research assistant. Your task is to analyze the input and suggest relevant guests based on the provided criteria. 
            Return 10-15 guest suggestions of real, notable people in this JSON format:
            [
              {
                "name": "Guest Name",
                "title": "Professional Title",
                "company": "Company Name",
                "expertise": ["Area 1", "Area 2"],
                "relevanceScore": 85,
                "reachScore": 75,
                "engagementScore": 90,
                "bio": "Short professional bio",
                "linkedinUrl": "https://linkedin.com/in/handle",
                "twitterHandle": "handle",
                "pastPodcasts": ["Podcast 1", "Podcast 2"],
                "topicMatch": ["Match 1", "Match 2"]
              }
            ]
            Focus on finding real, currently active professionals who would be genuinely relevant and interesting guests.
            Include a mix of well-known figures and rising stars in the field.
            Ensure all information is accurate and up-to-date.`
          },
          {
            role: 'user',
            content: `Find podcast guests with the following criteria:
              - Podcast Topic: ${params.podcastTopic}
              - Guest Expertise: ${params.guestExpertise}
              - Keywords: ${params.keywords}
              ${params.audienceSize ? `- Preferred Audience Size: ${params.audienceSize}` : ''}
              ${params.linkedinUrl ? `- LinkedIn Profile: ${params.linkedinUrl}` : ''}
              ${params.twitterHandle ? `- Twitter Handle: ${params.twitterHandle}` : ''}`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000,
        top_p: 1,
        stream: false,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GROQ API error:', errorText);
      throw new APIError(`Failed to fetch guest suggestions: ${response.status} ${errorText}`, response.status);
    }

    const data = await response.json();
    console.log('GROQ API response:', JSON.stringify(data, null, 2));
    if (!data.choices?.[0]?.message?.content) {
      throw new APIError('Invalid response from GROQ API');
    }

    const responseText = data.choices[0].message.content;
    const suggestions = parseAIResponse(responseText);

    // Validate and normalize social media URLs in the suggestions
    const validatedSuggestions = await Promise.all(
      suggestions.map(async (suggestion) => {
        if (suggestion.linkedinUrl) {
          const validation = await URLValidator.validateAndNormalizeURL(suggestion.linkedinUrl);
          if (validation.isValid && validation.normalizedURL) {
            suggestion.linkedinUrl = validation.normalizedURL;
          } else {
            suggestion.linkedinUrl = undefined;
          }
        }
        return suggestion;
      })
    );

    return validatedSuggestions;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw new APIError('Failed to search for guests');
  }
}
