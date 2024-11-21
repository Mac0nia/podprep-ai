import axios from 'axios';
import { YouTubeCreator, YouTubeVideo } from '../../types/youtube';
import { RateLimiter } from '../utils/rateLimiter';

export class YouTubeClient {
  private apiKey: string;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.rateLimiter = new RateLimiter();
  }

  private async searchChannels(topic: string): Promise<any[]> {
    await this.rateLimiter.checkLimit('youtube');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        type: 'channel',
        q: topic,
        maxResults: 25,
        key: this.apiKey,
        relevanceLanguage: 'en',
        order: 'relevance'
      }
    });
    return response.data.items;
  }

  private async getChannelStats(channelId: string): Promise<any> {
    await this.rateLimiter.checkLimit('youtube');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: {
        part: 'statistics,snippet,contentDetails',
        id: channelId,
        key: this.apiKey
      }
    });
    return response.data.items[0];
  }

  private async getChannelVideos(channelId: string, maxResults: number = 10): Promise<YouTubeVideo[]> {
    await this.rateLimiter.checkLimit('youtube');
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        channelId,
        maxResults,
        order: 'date',
        type: 'video',
        key: this.apiKey
      }
    });

    const videos = await Promise.all(
      response.data.items.map(async (item: any) => {
        await this.rateLimiter.checkLimit('youtube');
        const videoStats = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
          params: {
            part: 'statistics',
            id: item.id.videoId,
            key: this.apiKey
          }
        });

        return {
          id: item.id.videoId,
          title: item.snippet.title,
          description: item.snippet.description,
          publishedAt: new Date(item.snippet.publishedAt),
          thumbnailUrl: item.snippet.thumbnails.high.url,
          viewCount: parseInt(videoStats.data.items[0].statistics.viewCount),
          likeCount: parseInt(videoStats.data.items[0].statistics.likeCount || '0'),
          commentCount: parseInt(videoStats.data.items[0].statistics.commentCount || '0')
        };
      })
    );

    return videos;
  }

  async findExpertsOnTopic(topic: string): Promise<YouTubeCreator[]> {
    const channelResults = await this.searchChannels(topic);
    const creators: YouTubeCreator[] = [];

    for (const channel of channelResults) {
      const channelStats = await this.getChannelStats(channel.id.channelId);
      const recentVideos = await this.getChannelVideos(channel.id.channelId);

      // Calculate engagement metrics
      const avgViews = recentVideos.reduce((sum, video) => sum + video.viewCount, 0) / recentVideos.length;
      const avgLikes = recentVideos.reduce((sum, video) => sum + video.likeCount, 0) / recentVideos.length;
      const avgComments = recentVideos.reduce((sum, video) => sum + video.commentCount, 0) / recentVideos.length;
      const engagementRate = (avgLikes + avgComments) / avgViews * 100;

      creators.push({
        channelId: channel.id.channelId,
        name: channelStats.snippet.title,
        description: channelStats.snippet.description,
        thumbnailUrl: channelStats.snippet.thumbnails.high.url,
        metrics: {
          subscriberCount: parseInt(channelStats.statistics.subscriberCount),
          videoCount: parseInt(channelStats.statistics.videoCount),
          viewCount: parseInt(channelStats.statistics.viewCount),
          avgViews,
          avgLikes,
          avgComments,
          engagementRate
        },
        recentVideos,
        url: `https://youtube.com/channel/${channel.id.channelId}`
      });
    }

    // Sort by engagement rate and subscriber count
    return creators.sort((a, b) => 
      (b.metrics.engagementRate * Math.log10(b.metrics.subscriberCount)) -
      (a.metrics.engagementRate * Math.log10(a.metrics.subscriberCount))
    );
  }

  calculateSpeakingScore(creator: YouTubeCreator): number {
    const {
      avgViews,
      avgLikes,
      avgComments,
      subscriberCount,
      engagementRate
    } = creator.metrics;

    // Normalize metrics to 0-1 scale
    const normalizedViews = Math.min(avgViews / 100000, 1);
    const normalizedLikes = Math.min((avgLikes / avgViews) * 100, 1);
    const normalizedComments = Math.min((avgComments / avgViews) * 100, 1);
    const normalizedSubs = Math.min(subscriberCount / 100000, 1);
    const normalizedEngagement = Math.min(engagementRate / 10, 1);

    // Weight the metrics
    const weights = {
      views: 0.2,
      likes: 0.25,
      comments: 0.25,
      subscribers: 0.15,
      engagement: 0.15
    };

    // Calculate final score (0-100)
    const score = (
      normalizedViews * weights.views +
      normalizedLikes * weights.likes +
      normalizedComments * weights.comments +
      normalizedSubs * weights.subscribers +
      normalizedEngagement * weights.engagement
    ) * 100;

    return Math.round(score);
  }
}
