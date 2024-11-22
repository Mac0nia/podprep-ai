import { GuestSearchParams, ProfileResult } from '../../types/guest';
import { APIError } from '../guests';

const LINKEDIN_API_URL = 'https://api.linkedin.com/v2';

export class LinkedInSearchService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchProfiles(params: GuestSearchParams): Promise<ProfileResult[]> {
    try {
      // First, search for people matching our criteria
      const searchResults = await this.searchPeopleByKeywords(params);
      
      // Then enrich each profile with additional details
      const enrichedProfiles = await Promise.all(
        searchResults.map(profile => this.enrichProfileData(profile))
      );

      // Filter out profiles that don't meet our criteria
      return enrichedProfiles.filter(profile => 
        this.meetsQualityCriteria(profile, params)
      );
    } catch (error) {
      console.error('LinkedIn search error:', error);
      throw new APIError('Failed to search LinkedIn profiles');
    }
  }

  private async searchPeopleByKeywords(params: GuestSearchParams): Promise<ProfileResult[]> {
    const keywords = [
      ...(params.podcastTopic ? params.podcastTopic.split(',') : []),
      ...(params.guestExpertise ? params.guestExpertise.split(',') : []),
      ...(params.keywords ? params.keywords.split(',') : [])
    ].map(k => k.trim()).filter(Boolean);

    const searchParams = new URLSearchParams({
      q: 'people',
      keywords: keywords.join(' '),
      facetNetwork: ['F', 'S'], // First and second-degree connections
      facetProfileType: ['personal'], // Only personal profiles
      count: '25' // Limit results
    });

    const response = await fetch(`${LINKEDIN_API_URL}/search/people?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'X-RestLi-Protocol-Version': '2.0.0',
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new APIError(`LinkedIn API error: ${response.status}`);
    }

    const data = await response.json();
    return data.elements.map(this.mapLinkedInProfile);
  }

  private async enrichProfileData(profile: ProfileResult): Promise<ProfileResult> {
    try {
      // Get detailed profile information
      const detailsResponse = await fetch(`${LINKEDIN_API_URL}/people/${profile.linkedinId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'X-RestLi-Protocol-Version': '2.0.0'
        }
      });

      if (!detailsResponse.ok) {
        return profile; // Return original profile if enrichment fails
      }

      const details = await detailsResponse.json();

      // Get recent posts to assess engagement
      const postsResponse = await fetch(
        `${LINKEDIN_API_URL}/people/${profile.linkedinId}/posts`, 
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'X-RestLi-Protocol-Version': '2.0.0'
          }
        }
      );

      const posts = postsResponse.ok ? await postsResponse.json() : { elements: [] };

      // Calculate engagement metrics
      const engagement = this.calculateEngagement(posts.elements);

      return {
        ...profile,
        bio: details.description || profile.bio,
        followers: details.numFollowers || 0,
        engagementRate: engagement.rate,
        recentPosts: engagement.postCount,
        expertise: [
          ...new Set([
            ...(profile.expertise || []),
            ...(details.skills?.elements?.map(s => s.name) || [])
          ])
        ]
      };
    } catch (error) {
      console.error('Profile enrichment error:', error);
      return profile; // Return original profile if enrichment fails
    }
  }

  private calculateEngagement(posts: any[]): { rate: number; postCount: number } {
    if (!posts.length) {
      return { rate: 0, postCount: 0 };
    }

    const totalEngagement = posts.reduce((sum, post) => {
      const likes = post.socialDetail?.numLikes || 0;
      const comments = post.socialDetail?.numComments || 0;
      const shares = post.socialDetail?.numShares || 0;
      return sum + likes + comments * 2 + shares * 3;
    }, 0);

    return {
      rate: totalEngagement / posts.length,
      postCount: posts.length
    };
  }

  private meetsQualityCriteria(profile: ProfileResult, params: GuestSearchParams): boolean {
    // Must have a complete profile
    if (!profile.name || !profile.title || !profile.company) {
      return false;
    }

    // Must have some expertise listed
    if (!profile.expertise?.length) {
      return false;
    }

    // Check audience size requirements if specified
    if (params.audienceSize) {
      const minFollowers = this.parseAudienceSize(params.audienceSize);
      if (profile.followers < minFollowers) {
        return false;
      }
    }

    // Must have some recent activity
    if (profile.recentPosts < 3) {
      return false;
    }

    return true;
  }

  private parseAudienceSize(size: string): number {
    const sizeMap = {
      'small': 1000,
      'medium': 5000,
      'large': 20000
    };
    return sizeMap[size.toLowerCase()] || 1000;
  }

  private mapLinkedInProfile(data: any): ProfileResult {
    return {
      name: `${data.firstName} ${data.lastName}`,
      title: data.headline || '',
      company: data.positions?.elements?.[0]?.companyName || '',
      linkedinId: data.id,
      linkedinUrl: `https://www.linkedin.com/in/${data.vanityName || data.id}`,
      bio: data.summary || '',
      expertise: [],
      followers: 0,
      engagementRate: 0,
      recentPosts: 0
    };
  }
}
