import { GuestSearchParams, ProfileResult } from '../../types/guest';
import { APIError } from '../guests';

const TWITTER_API_URL = 'https://api.twitter.com/2';

export class TwitterSearchService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchProfiles(params: GuestSearchParams): Promise<ProfileResult[]> {
    try {
      // First, search for users matching our criteria
      const searchResults = await this.searchUsersByKeywords(params);
      
      // Then enrich each profile with additional details
      const enrichedProfiles = await Promise.all(
        searchResults.map(profile => this.enrichProfileData(profile))
      );

      // Filter out profiles that don't meet our criteria
      return enrichedProfiles.filter(profile => 
        this.meetsQualityCriteria(profile, params)
      );
    } catch (error) {
      console.error('Twitter search error:', error);
      throw new APIError('Failed to search Twitter profiles');
    }
  }

  private async searchUsersByKeywords(params: GuestSearchParams): Promise<ProfileResult[]> {
    const keywords = [
      ...(params.podcastTopic ? params.podcastTopic.split(',') : []),
      ...(params.guestExpertise ? params.guestExpertise.split(',') : []),
      ...(params.keywords ? params.keywords.split(',') : [])
    ].map(k => k.trim()).filter(Boolean);

    // Create search query
    const query = keywords.map(k => `${k} -is:retweet -is:reply`).join(' OR ');
    
    const searchParams = new URLSearchParams({
      query,
      'user.fields': 'description,public_metrics,verified,url',
      'tweet.fields': 'public_metrics,created_at',
      'expansions': 'author_id',
      'max_results': '25'
    });

    const response = await fetch(`${TWITTER_API_URL}/tweets/search/recent?${searchParams}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new APIError(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    const users = data.includes?.users || [];
    
    return users.map(this.mapTwitterProfile);
  }

  private async enrichProfileData(profile: ProfileResult): Promise<ProfileResult> {
    try {
      // Get user's recent tweets
      const tweetsResponse = await fetch(
        `${TWITTER_API_URL}/users/${profile.twitterId}/tweets?max_results=100&tweet.fields=public_metrics,created_at`, 
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!tweetsResponse.ok) {
        return profile;
      }

      const tweets = await tweetsResponse.json();
      
      // Calculate engagement metrics
      const engagement = this.calculateEngagement(tweets.data || []);

      // Get user's detailed profile
      const userResponse = await fetch(
        `${TWITTER_API_URL}/users/${profile.twitterId}?user.fields=description,public_metrics,verified,url`, 
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );

      if (!userResponse.ok) {
        return profile;
      }

      const user = await userResponse.json();

      return {
        ...profile,
        bio: user.data.description || profile.bio,
        followers: user.data.public_metrics.followers_count || 0,
        engagementRate: engagement.rate,
        recentPosts: engagement.tweetCount,
        verified: user.data.verified || false
      };
    } catch (error) {
      console.error('Profile enrichment error:', error);
      return profile;
    }
  }

  private calculateEngagement(tweets: any[]): { rate: number; tweetCount: number } {
    if (!tweets.length) {
      return { rate: 0, tweetCount: 0 };
    }

    const totalEngagement = tweets.reduce((sum, tweet) => {
      const likes = tweet.public_metrics?.like_count || 0;
      const replies = tweet.public_metrics?.reply_count || 0;
      const retweets = tweet.public_metrics?.retweet_count || 0;
      const quotes = tweet.public_metrics?.quote_count || 0;
      return sum + likes + replies * 2 + retweets * 3 + quotes * 3;
    }, 0);

    return {
      rate: totalEngagement / tweets.length,
      tweetCount: tweets.length
    };
  }

  private meetsQualityCriteria(profile: ProfileResult, params: GuestSearchParams): boolean {
    // Must have a complete profile
    if (!profile.name || !profile.bio) {
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
    if (profile.recentPosts < 10) {
      return false;
    }

    // Engagement rate should be above minimum threshold
    if (profile.engagementRate < 0.5) {
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

  private mapTwitterProfile(data: any): ProfileResult {
    const nameParts = data.name.split(' ');
    const lastName = nameParts.pop() || '';
    const firstName = nameParts.join(' ');

    return {
      name: data.name,
      title: '',  // Twitter profiles don't have titles
      company: '', // Will be enriched later if available
      twitterId: data.id,
      twitterHandle: data.username,
      bio: data.description || '',
      expertise: [], // Will be extracted from bio and tweets
      followers: data.public_metrics?.followers_count || 0,
      engagementRate: 0,
      recentPosts: 0,
      verified: data.verified || false
    };
  }
}
