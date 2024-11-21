import axios from 'axios';
import { SubstackWriter, SubstackPost } from '../../types/substack';

export class SubstackClient {
  private async searchSubstackNewsletters(topic: string): Promise<string[]> {
    try {
      // Use Google Custom Search API to find Substack newsletters
      const response = await axios.get(
        `https://www.googleapis.com/customsearch/v1`,
        {
          params: {
            key: process.env.VITE_GOOGLE_API_KEY,
            cx: process.env.VITE_GOOGLE_CSE_ID,
            q: `site:substack.com ${topic}`,
            dateRestrict: 'm6', // Last 6 months
            num: 10
          }
        }
      );

      // Extract newsletter URLs
      const newsletters = response.data.items
        .map((item: any) => {
          const match = item.link.match(/(https:\/\/[^.]+\.substack\.com)/);
          return match ? match[1] : null;
        })
        .filter((url: string | null) => url !== null);

      return [...new Set(newsletters)]; // Remove duplicates
    } catch (error) {
      console.error('Substack search error:', error);
      return [];
    }
  }

  private async fetchNewsletterInfo(url: string): Promise<SubstackWriter | null> {
    try {
      // Fetch RSS feed
      const rssUrl = `${url}/feed`;
      const response = await axios.get(rssUrl);
      const feed = response.data;

      // Parse RSS feed to get posts
      const posts: SubstackPost[] = feed.items.map((item: any) => ({
        title: item.title,
        link: item.link,
        pubDate: new Date(item.pubDate),
        description: item.description,
        comments: parseInt(item.comments || '0', 10),
        categories: item.categories || []
      }));

      // Extract newsletter name from URL
      const name = url.match(/https:\/\/([^.]+)\.substack\.com/)?.[1] || '';

      // Calculate metrics
      const totalPosts = posts.length;
      const postFrequency = posts.length / 6; // Posts per month
      const avgComments = posts.reduce((sum, post) => sum + post.comments, 0) / totalPosts;

      return {
        name,
        url,
        posts,
        metrics: {
          totalPosts,
          postFrequency,
          avgComments,
          topics: Array.from(new Set(posts.flatMap(post => post.categories)))
        }
      };
    } catch (error) {
      console.error(`Failed to fetch newsletter info for ${url}:`, error);
      return null;
    }
  }

  async findExpertsOnTopic(topic: string): Promise<SubstackWriter[]> {
    const newsletterUrls = await this.searchSubstackNewsletters(topic);
    const writers = await Promise.all(
      newsletterUrls.map(url => this.fetchNewsletterInfo(url))
    );

    return writers.filter((writer): writer is SubstackWriter => writer !== null);
  }
}
