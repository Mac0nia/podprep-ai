export interface MediumPost {
  title: string;
  link: string;
  pubDate: Date;
  content: string;
  categories: string[];
  claps: number;
}

export interface MediumUser {
  username: string;
  posts: MediumPost[];
  metrics: {
    totalPosts: number;
    totalClaps: number;
    avgClapsPerPost: number;
    postFrequency: number; // Posts per month
    topics: string[];
  };
  profileUrl: string;
}
