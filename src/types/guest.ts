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
}

export interface GuestSearchParams {
  podcastTopic: string;
  guestExpertise: string;
  keywords: string;
  audienceSize?: string;
  linkedinUrl?: string;
  twitterHandle?: string;
}
