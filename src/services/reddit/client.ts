import axios from 'axios';
import { RedditUser, RedditComment, RedditSubmission } from '../../types/reddit';

const REDDIT_API_BASE = 'https://www.reddit.com';

export class RedditClient {
  private async fetchJson(endpoint: string) {
    try {
      const response = await axios.get(`${REDDIT_API_BASE}${endpoint}.json`);
      return response.data;
    } catch (error) {
      console.error('Reddit API error:', error);
      throw error;
    }
  }

  async findExpertsInSubreddit(subreddit: string, timeframe: string = 'month', limit: number = 100): Promise<RedditUser[]> {
    // Get top posts and comments from subreddit
    const posts = await this.fetchJson(`/r/${subreddit}/top/.json?t=${timeframe}&limit=${limit}`);
    const comments = await this.fetchJson(`/r/${subreddit}/comments/.json?t=${timeframe}&limit=${limit}`);

    // Combine and analyze user contributions
    const userContributions = new Map<string, {
      posts: number;
      comments: number;
      totalScore: number;
      detailedResponses: number;
    }>();

    // Process posts
    posts.data.children.forEach((post: any) => {
      const author = post.data.author;
      if (!userContributions.has(author)) {
        userContributions.set(author, { posts: 0, comments: 0, totalScore: 0, detailedResponses: 0 });
      }
      const userData = userContributions.get(author)!;
      userData.posts += 1;
      userData.totalScore += post.data.score;
    });

    // Process comments
    comments.data.children.forEach((comment: any) => {
      const author = comment.data.author;
      if (!userContributions.has(author)) {
        userContributions.set(author, { posts: 0, comments: 0, totalScore: 0, detailedResponses: 0 });
      }
      const userData = userContributions.get(author)!;
      userData.comments += 1;
      userData.totalScore += comment.data.score;
      
      // Consider detailed responses (longer, well-received comments)
      if (comment.data.body.length > 300 && comment.data.score > 5) {
        userData.detailedResponses += 1;
      }
    });

    // Convert to array and sort by engagement metrics
    const experts = Array.from(userContributions.entries())
      .map(([username, stats]) => ({
        username,
        subreddit,
        contributionScore: stats.totalScore * 0.3 + 
                          stats.detailedResponses * 0.4 + 
                          stats.posts * 0.1 + 
                          stats.comments * 0.2,
        stats
      }))
      .sort((a, b) => b.contributionScore - a.contributionScore)
      .slice(0, 10); // Top 10 contributors

    // Get detailed user info
    const expertDetails = await Promise.all(
      experts.map(async (expert) => {
        try {
          const userInfo = await this.fetchJson(`/user/${expert.username}/about`);
          return {
            username: expert.username,
            subreddit,
            karma: userInfo.data.total_karma,
            accountAge: userInfo.data.created_utc,
            contributionScore: expert.contributionScore,
            stats: expert.stats
          };
        } catch (error) {
          console.error(`Error fetching details for user ${expert.username}:`, error);
          return null;
        }
      })
    );

    return expertDetails.filter((expert): expert is RedditUser => expert !== null);
  }
}
