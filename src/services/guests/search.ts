import { Configuration, OpenAIApi } from 'openai';
import { RedditClient } from '../reddit/client';
import { MediumClient } from '../medium/client';
import { SubstackClient } from '../substack/client';
import { YouTubeClient } from '../youtube/client';
import { GuestSearchParams, GuestSuggestion } from '../../types/guest';
import { RedditUser } from '../../types/reddit';
import { MediumUser } from '../../types/medium';
import { SubstackWriter } from '../../types/substack';
import { YouTubeCreator } from '../../types/youtube';
import { RateLimiter } from '../utils/rateLimiter';

export class GuestSearchService {
  private redditClient: RedditClient;
  private mediumClient: MediumClient;
  private substackClient: SubstackClient;
  private youtubeClient: YouTubeClient;
  private openai: OpenAIApi;
  private rateLimiter: RateLimiter;

  constructor() {
    this.redditClient = new RedditClient();
    this.mediumClient = new MediumClient();
    this.substackClient = new SubstackClient();
    this.youtubeClient = new YouTubeClient(process.env.VITE_GOOGLE_API_KEY || '');
    this.rateLimiter = new RateLimiter();
    this.openai = new OpenAIApi(
      new Configuration({
        apiKey: process.env.VITE_OPENAI_API_KEY,
      })
    );
  }

  private async findRelevantSubreddits(topic: string): Promise<string[]> {
    const prompt = `Given the topic "${topic}", what are the 3-5 most relevant and active subreddits where experts in this field might be active? Only return the subreddit names without "r/", one per line.`;
    
    const completion = await this.openai.createChatCompletion({
      model: process.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const subreddits = completion.data.choices[0].message?.content
      ?.split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0) || [];
    
    return subreddits;
  }

  async searchGuests(params: GuestSearchParams): Promise<GuestSuggestion[]> {
    try {
      // 1. Search across all platforms in parallel with rate limiting
      const [redditExperts, mediumExperts, substackWriters, youtubeCreators] = await Promise.all([
        this.rateLimiter.getCached(`reddit:${params.podcastTopic}`, () => this.searchReddit(params)),
        this.rateLimiter.getCached(`medium:${params.podcastTopic}`, () => this.searchMedium(params)),
        this.rateLimiter.getCached(`substack:${params.podcastTopic}`, () => this.searchSubstack(params)),
        this.rateLimiter.getCached(`youtube:${params.podcastTopic}`, () => this.searchYouTube(params))
      ]);

      // 2. Combine all experts
      const allExperts = [
        ...this.formatRedditExperts(redditExperts),
        ...this.formatMediumExperts(mediumExperts),
        ...this.formatSubstackExperts(substackWriters),
        ...this.formatYouTubeExperts(youtubeCreators)
      ];

      // 3. Use GPT to analyze and rank all candidates
      const rankedExperts = await this.analyzeCandidates(allExperts, params);

      return rankedExperts;
    } catch (error) {
      console.error('Error searching for guests:', error);
      throw error;
    }
  }

  private async searchReddit(params: GuestSearchParams): Promise<RedditUser[]> {
    const subreddits = await this.findRelevantSubreddits(params.podcastTopic);
    const experts = await Promise.all(
      subreddits.map(subreddit => 
        this.redditClient.findExpertsInSubreddit(subreddit)
      )
    );
    return experts.flat();
  }

  private async searchMedium(params: GuestSearchParams): Promise<MediumUser[]> {
    return this.mediumClient.findExpertsOnTopic(params.podcastTopic);
  }

  private async searchSubstack(params: GuestSearchParams): Promise<SubstackWriter[]> {
    return this.substackClient.findExpertsOnTopic(params.podcastTopic);
  }

  private async searchYouTube(params: GuestSearchParams): Promise<YouTubeCreator[]> {
    return this.youtubeClient.findExpertsOnTopic(params.podcastTopic);
  }

  private formatRedditExperts(experts: RedditUser[]): any[] {
    return experts.map(expert => ({
      name: expert.username,
      platform: 'Reddit',
      url: `https://reddit.com/user/${expert.username}`,
      metrics: {
        karma: expert.karma,
        detailedResponses: expert.stats.detailedResponses,
        totalScore: expert.stats.totalScore,
        activity: expert.stats.posts + expert.stats.comments
      }
    }));
  }

  private formatMediumExperts(experts: MediumUser[]): any[] {
    return experts.map(expert => ({
      name: expert.username,
      platform: 'Medium',
      url: expert.profileUrl,
      metrics: {
        totalPosts: expert.metrics.totalPosts,
        totalClaps: expert.metrics.totalClaps,
        avgClapsPerPost: expert.metrics.avgClapsPerPost,
        postFrequency: expert.metrics.postFrequency
      }
    }));
  }

  private formatSubstackExperts(experts: SubstackWriter[]): any[] {
    return experts.map(expert => ({
      name: expert.name,
      platform: 'Substack',
      url: expert.url,
      metrics: {
        totalPosts: expert.metrics.totalPosts,
        postFrequency: expert.metrics.postFrequency,
        avgComments: expert.metrics.avgComments
      }
    }));
  }

  private formatYouTubeExperts(creators: YouTubeCreator[]): any[] {
    return creators.map(creator => ({
      name: creator.name,
      platform: 'YouTube',
      url: creator.url,
      description: creator.description,
      thumbnailUrl: creator.thumbnailUrl,
      metrics: {
        subscribers: creator.metrics.subscriberCount,
        totalViews: creator.metrics.viewCount,
        avgViews: creator.metrics.avgViews,
        engagementRate: creator.metrics.engagementRate,
        speakingScore: this.youtubeClient.calculateSpeakingScore(creator)
      },
      recentContent: creator.recentVideos.map(video => ({
        title: video.title,
        url: `https://youtube.com/watch?v=${video.id}`,
        views: video.viewCount,
        engagement: (video.likeCount + video.commentCount) / video.viewCount
      }))
    }));
  }

  private async analyzeCandidates(
    candidates: any[],
    params: GuestSearchParams
  ): Promise<GuestSuggestion[]> {
    const prompt = `Analyze these content creators as potential podcast guests. Topic: ${params.podcastTopic}
Requirements: ${params.guestExpertise}
Format: JSON array of objects with fields: name, platform, relevanceScore (0-100), reasoning (2-3 sentences)

Candidates:
${JSON.stringify(candidates, null, 2)}

Focus on:
1. Quality of content and expertise
2. Engagement with audience
3. Speaking ability (especially for YouTube creators)
4. Relevance to topic
5. Potential for interesting conversation
6. Unique perspectives and insights`;

    const completion = await this.openai.createChatCompletion({
      model: process.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });

    const analysis = JSON.parse(completion.data.choices[0].message?.content || '[]');

    return analysis.map((result: any) => ({
      name: result.name,
      platform: result.platform,
      relevanceScore: result.relevanceScore,
      reasoning: result.reasoning,
      profileUrl: candidates.find(c => c.name === result.name)?.url || '',
      thumbnailUrl: candidates.find(c => c.name === result.name)?.thumbnailUrl,
      recentContent: candidates.find(c => c.name === result.name)?.recentContent
    }));
  }
}
