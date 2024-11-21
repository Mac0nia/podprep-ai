export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface YouTubeCreator {
  channelId: string;
  name: string;
  description: string;
  thumbnailUrl: string;
  metrics: {
    subscriberCount: number;
    videoCount: number;
    viewCount: number;
    avgViews: number;
    avgLikes: number;
    avgComments: number;
    engagementRate: number;
  };
  recentVideos: YouTubeVideo[];
  url: string;
}
