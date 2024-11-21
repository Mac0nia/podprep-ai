import axios from 'axios';
import { MediumUser, MediumPost } from '../../types/medium';

export class MediumClient {
  private async fetchRssFeed(username: string): Promise<any> {
    try {
      const response = await axios.get(`https://medium.com/feed/@${username}`);
      return response.data;
    } catch (error) {
      console.error('Medium RSS error:', error);
      return null;
    }
  }

  private async searchMediumPosts(topic: string): Promise<string[]> {
    try {
      // Use Google Custom Search API to find Medium posts
      const response = await axios.get(
        `https://www.googleapis.com/customsearch/v1`,
        {
          params: {
            key: process.env.VITE_GOOGLE_API_KEY,
            cx: process.env.VITE_GOOGLE_CSE_ID,
            q: `site:medium.com ${topic}`,
            dateRestrict: 'm6', // Last 6 months
            num: 10
          }
        }
      );

      // Extract usernames from URLs
      const usernames = response.data.items
        .map((item: any) => {
          const match = item.link.match(/medium\.com\/@([^/]+)/);
          return match ? match[1] : null;
        })
        .filter((username: string | null) => username !== null);

      return [...new Set(usernames)]; // Remove duplicates
    } catch (error) {
      console.error('Medium search error:', error);
      return [];
    }
  }

  async findExpertsOnTopic(topic: string): Promise<MediumUser[]> {
    const usernames = await this.searchMediumPosts(topic);
    const experts: MediumUser[] = [];

    for (const username of usernames) {
      const feed = await this.fetchRssFeed(username);
      if (!feed) continue;

      // Parse RSS feed to get user's posts
      const posts: MediumPost[] = feed.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        pubDate: new Date(item.pubDate),
        content: item.content,
        categories: item.categories || [],
        claps: parseInt(item['dc:creator'] || '0', 10)
      }));

      // Calculate user metrics
      const totalClaps = posts.reduce((sum, post) => sum + post.claps, 0);
      const avgClapsPerPost = totalClaps / posts.length;
      const postFrequency = posts.length / 6; // Posts per month over last 6 months

      experts.push({
        username,
        posts,
        metrics: {
          totalPosts: posts.length,
          totalClaps,
          avgClapsPerPost,
          postFrequency,
          topics: Array.from(new Set(posts.flatMap(post => post.categories)))
        },
        profileUrl: `https://medium.com/@${username}`
      });
    }

    return experts;
  }
}
