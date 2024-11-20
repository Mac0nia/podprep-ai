import { LinkedInProfile } from '../../types/linkedin';

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

export class LinkedInClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async searchPeople(params: {
    keywords: string;
    title?: string;
    industry?: string;
    limit?: number;
  }): Promise<LinkedInProfile[]> {
    const searchParams = new URLSearchParams({
      q: 'people',
      keywords: params.keywords,
      ...(params.title && { title: params.title }),
      ...(params.industry && { industry: params.industry }),
      count: String(params.limit || 10),
    });

    const response = await fetch(`${LINKEDIN_API_URL}/search?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json();
    return data.elements;
  }

  async getProfile(profileId: string): Promise<LinkedInProfile> {
    const response = await fetch(`${LINKEDIN_API_URL}/people/${profileId}`, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0',
      },
    });

    if (!response.ok) {
      throw new Error(`LinkedIn API error: ${response.status}`);
    }

    return response.json();
  }
}
