import { z } from 'zod';

export const GuestSearchSchema = z.object({
  podcastTopic: z.string(),
  guestExpertise: z.string(),
  keywords: z.array(z.string()),
  audienceSize: z.number().optional(),
  linkedinUrl: z.string().url().optional(),
  twitterHandle: z.string().optional(),
});

export type GuestSearchParams = z.infer<typeof GuestSearchSchema>;

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

export interface GuestSearchResponse {
  suggestions: GuestSuggestion[];
  totalResults: number;
  page: number;
  pageSize: number;
}
