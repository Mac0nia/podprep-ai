export interface ProfileResult {
  name: string;
  title: string;
  company: string;
  expertise: string[];
  bio: string;
  linkedinId?: string;
  linkedinUrl?: string;
  twitterId?: string;
  twitterHandle?: string;
  followers: number;
  engagementRate: number;
  recentPosts: number;
  verified?: boolean;
}

export interface GuestSuggestion {
  name: string;
  title: string;
  company: string;
  expertise: string[];
  relevanceScore: number;
  reachScore: number;
  engagementScore: number;
  bio: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  pastPodcasts: string[];
  topicMatch: string[];
  verificationNotes?: string;
  followers?: number;
  verified?: boolean;
}

export interface GuestSearchParams {
  podcastTopic: string;
  guestExpertise?: string;
  keywords?: string;
  audienceSize?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  excludeVerified?: boolean;
  maxFollowers?: number;
}
