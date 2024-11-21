export interface SubstackPost {
  title: string;
  link: string;
  pubDate: Date;
  description: string;
  comments: number;
  categories: string[];
}

export interface SubstackWriter {
  name: string;
  url: string;
  posts: SubstackPost[];
  metrics: {
    totalPosts: number;
    postFrequency: number; // Posts per month
    avgComments: number;
    topics: string[];
  };
}
