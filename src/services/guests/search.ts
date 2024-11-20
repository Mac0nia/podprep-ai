import { Configuration, OpenAIApi } from 'openai';
import { LinkedInClient } from '../linkedin/client';
import { TwitterClient } from '../twitter/client';
import { GuestSearchParams, GuestSuggestion } from '../../types/guest';
import { LinkedInProfile } from '../../types/linkedin';
import { TwitterProfile } from '../../types/twitter';

export class GuestSearchService {
  private linkedInClient: LinkedInClient;
  private twitterClient: TwitterClient;
  private openai: OpenAIApi;

  constructor() {
    // Initialize clients with API keys from environment variables
    this.linkedInClient = new LinkedInClient(process.env.VITE_LINKEDIN_ACCESS_TOKEN || '');
    this.twitterClient = new TwitterClient(process.env.VITE_TWITTER_BEARER_TOKEN || '');
    this.openai = new OpenAIApi(
      new Configuration({
        apiKey: process.env.VITE_OPENAI_API_KEY,
      })
    );
  }

  async searchGuests(params: GuestSearchParams): Promise<GuestSuggestion[]> {
    try {
      // 1. Search LinkedIn for potential guests
      const linkedInProfiles = await this.linkedInClient.searchPeople({
        keywords: `${params.podcastTopic} ${params.guestExpertise}`,
        limit: 20,
      });

      // 2. Enrich profiles with Twitter data when available
      const enrichedProfiles = await Promise.all(
        linkedInProfiles.map(async (profile) => {
          try {
            const twitterHandle = await this.findTwitterHandle(profile);
            if (twitterHandle) {
              const twitterProfile = await this.twitterClient.getUserByUsername(twitterHandle);
              const recentTweets = await this.twitterClient.getRecentTweets(twitterProfile.id);
              const engagementScore = this.twitterClient.calculateEngagementScore(twitterProfile, recentTweets);
              return { profile, twitter: { profile: twitterProfile, engagementScore } };
            }
          } catch (error) {
            console.warn(`Failed to fetch Twitter data for ${profile.firstName} ${profile.lastName}:`, error);
          }
          return { profile };
        })
      );

      // 3. Use GPT-4 to analyze and score candidates
      const guestSuggestions = await this.analyzeAndScoreCandidates(
        enrichedProfiles,
        params
      );

      return guestSuggestions;
    } catch (error) {
      console.error('Error searching for guests:', error);
      throw error;
    }
  }

  private async findTwitterHandle(profile: LinkedInProfile): Promise<string | null> {
    try {
      const completion = await this.openai.createChatCompletion({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a research assistant. Find the most likely Twitter handle for this professional based on their LinkedIn profile. Return ONLY the handle without @ or explanation.',
          },
          {
            role: 'user',
            content: `Name: ${profile.firstName} ${profile.lastName}
            Title: ${profile.positions?.elements[0]?.title || ''}
            Company: ${profile.positions?.elements[0]?.companyName || ''}
            Industry: ${profile.industry || ''}`,
          },
        ],
      });

      const handle = completion.data.choices[0]?.message?.content?.trim();
      return handle || null;
    } catch (error) {
      console.warn('Failed to find Twitter handle:', error);
      return null;
    }
  }

  private async analyzeAndScoreCandidates(
    enrichedProfiles: Array<{
      profile: LinkedInProfile;
      twitter?: {
        profile: TwitterProfile;
        engagementScore: number;
      };
    }>,
    searchParams: GuestSearchParams
  ): Promise<GuestSuggestion[]> {
    const completion = await this.openai.createChatCompletion({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a podcast guest curator. Analyze these potential guests and return them in order of relevance.
          Consider their expertise, experience, and social media presence. Return the results as a JSON array of GuestSuggestion objects.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            searchCriteria: searchParams,
            candidates: enrichedProfiles,
          }),
        },
      ],
    });

    const suggestions = JSON.parse(completion.data.choices[0]?.message?.content || '[]');
    return suggestions;
  }
}
