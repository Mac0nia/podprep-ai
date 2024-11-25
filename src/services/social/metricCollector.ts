import axios from 'axios';
import { SocialMetrics } from '../scoring/guestScorer';

export class SocialMetricCollector {
  private googleApiKey: string;
  private googleSearchEngineId: string;

  constructor(googleApiKey: string, googleSearchEngineId: string) {
    this.googleApiKey = googleApiKey;
    this.googleSearchEngineId = googleSearchEngineId;
  }

  async collectMetrics(linkedinUrl?: string, twitterHandle?: string): Promise<SocialMetrics> {
    const metrics: SocialMetrics = {
      followers: 0,
      posts: 0,
      engagement: 0
    };

    try {
      // Use Google Search to find social proof and metrics
      const searchQuery = `${linkedinUrl || ''} ${twitterHandle || ''} followers profile`;
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: searchQuery,
          num: 10
        }
      });

      if (response.data.items) {
        // Extract follower counts from search results
        for (const item of response.data.items) {
          const followerMatch = item.snippet.match(/(\d+(?:,\d+)*)\s*(?:followers|connections)/i);
          if (followerMatch) {
            const followers = parseInt(followerMatch[1].replace(/,/g, ''));
            metrics.followers = Math.max(metrics.followers, followers);
          }

          // Look for engagement metrics
          const engagementMatch = item.snippet.match(/(\d+(?:\.\d+)?%)\s*engagement/i);
          if (engagementMatch) {
            const engagement = parseFloat(engagementMatch[1]);
            metrics.engagement = Math.max(metrics.engagement, engagement);
          }
        }
      }

      // If we found no metrics, estimate based on search results
      if (metrics.followers === 0) {
        metrics.followers = this.estimateFollowers(response.data.items);
      }

      if (metrics.engagement === 0) {
        metrics.engagement = 0.02; // Default to 2% engagement rate
      }

    } catch (error) {
      console.error('Error collecting social metrics:', error);
      // Return conservative estimates if we can't get real data
      metrics.followers = 500;    // Minimum follower estimate
      metrics.engagement = 0.02;  // 2% engagement rate
    }

    return metrics;
  }

  private estimateFollowers(searchResults: any[]): number {
    // Estimate followers based on web presence
    let estimate = 500; // Base minimum

    if (!searchResults) return estimate;

    // More search results = likely more followers
    estimate += searchResults.length * 100;

    // Look for indicators of influence
    for (const result of searchResults) {
      if (result.snippet.match(/influential|expert|thought leader|keynote|speaker/i)) {
        estimate += 1000;
      }
      if (result.snippet.match(/featured|interviewed|quoted/i)) {
        estimate += 500;
      }
    }

    return estimate;
  }
}
