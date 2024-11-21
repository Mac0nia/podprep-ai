export interface RedditUser {
  username: string;
  subreddit: string;
  karma: number;
  accountAge: number;
  contributionScore: number;
  stats: {
    posts: number;
    comments: number;
    totalScore: number;
    detailedResponses: number;
  };
}

export interface RedditComment {
  id: string;
  author: string;
  body: string;
  score: number;
  created_utc: number;
  subreddit: string;
}

export interface RedditSubmission {
  id: string;
  author: string;
  title: string;
  selftext: string;
  score: number;
  created_utc: number;
  subreddit: string;
}
