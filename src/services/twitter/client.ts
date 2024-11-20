import { TwitterProfile } from '../../types/twitter';

const TWITTER_API_URL = 'https://api.twitter.com/2';

export class TwitterClient {
  private bearerToken: string;

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  async getUserByUsername(username: string): Promise<TwitterProfile> {
    const response = await fetch(
      `${TWITTER_API_URL}/users/by/username/${username}?user.fields=public_metrics,description,verified`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  async getRecentTweets(userId: string, limit: number = 10): Promise<any[]> {
    const response = await fetch(
      `${TWITTER_API_URL}/users/${userId}/tweets?max_results=${limit}&tweet.fields=public_metrics`,
      {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Twitter API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data || [];
  }

  calculateEngagementScore(profile: TwitterProfile, recentTweets: any[]): number {
    const { followers_count, following_count } = profile.public_metrics;
    const followerRatio = followers_count / (following_count || 1);

    const avgEngagement = recentTweets.reduce((sum, tweet) => {
      const { retweet_count, reply_count, like_count } = tweet.public_metrics;
      return sum + (retweet_count + reply_count + like_count);
    }, 0) / recentTweets.length;

    // Score from 0-100 based on follower ratio and average engagement
    const score = Math.min(
      100,
      (followerRatio * 30) + (avgEngagement * 0.7)
    );

    return Math.round(score);
  }
}
