import { GuestSuggestion } from '../../types/guest';
import axios, { AxiosError } from 'axios';

interface VerificationResult {
  isReal: boolean;
  relevanceScore: number;
  verificationNotes: string[];
  linkedinData?: any;
  twitterData?: any;
  webPresence?: string[];
}

interface GoogleSearchResult {
  items?: Array<{
    link: string;
    title: string;
    snippet: string;
  }>;
}

export class RealPersonVerifier {
  private googleApiKey: string;
  private googleSearchEngineId: string;
  private readonly GOOGLE_API_ENDPOINT = 'https://www.googleapis.com/customsearch/v1';

  constructor(googleApiKey: string, googleSearchEngineId: string) {
    if (!googleApiKey || !googleSearchEngineId) {
      throw new Error('Google API key and Search Engine ID are required');
    }
    this.googleApiKey = googleApiKey;
    this.googleSearchEngineId = googleSearchEngineId;
  }

  async verifyPerson(suggestion: GuestSuggestion, searchTopic: string): Promise<VerificationResult> {
    const verificationNotes: string[] = [];
    let isReal = false;
    let relevanceScore = 0;
    let webPresence: string[] = [];

    try {
      console.log(`Starting verification for: ${suggestion.name}`);

      // Search for professional presence first
      const professionalResults = await this.searchWebPresence(
        `${suggestion.name} ${suggestion.title} ${suggestion.company} ${searchTopic}`
      );
      console.log(`Professional presence results: ${professionalResults.length}`);
      
      if (professionalResults.length > 0) {
        webPresence = professionalResults;
        verificationNotes.push(`✓ Found ${professionalResults.length} professional references`);
        relevanceScore += 30;
        isReal = true; // If we find professional presence, consider them real
      }

      // Search for the person's LinkedIn profile
      const linkedinResults = await this.searchWebPresence(
        `site:linkedin.com/in ${suggestion.name} ${suggestion.company}`
      );
      console.log(`LinkedIn results: ${linkedinResults.length}`);
      
      if (linkedinResults.length > 0) {
        suggestion.linkedinUrl = linkedinResults[0]; // Use the first LinkedIn result
        verificationNotes.push('✓ LinkedIn profile found');
        relevanceScore += 20;
      }

      // Search for Twitter profile
      const twitterResults = await this.searchWebPresence(
        `site:twitter.com ${suggestion.name}`
      );
      console.log(`Twitter results: ${twitterResults.length}`);
      
      if (twitterResults.length > 0) {
        const twitterUrl = twitterResults[0];
        suggestion.twitterHandle = twitterUrl.split('/').pop() || suggestion.twitterHandle;
        verificationNotes.push('✓ Twitter profile found');
        relevanceScore += 10;
      }

      // Search for recent activity
      const recentResults = await this.searchWebPresence(
        `${suggestion.name} ${searchTopic} ${new Date().getFullYear()}`
      );
      console.log(`Recent activity results: ${recentResults.length}`);
      
      if (recentResults.length > 0) {
        verificationNotes.push('✓ Recent activity found');
        relevanceScore += 20;
        webPresence = [...new Set([...webPresence, ...recentResults])];
      }

      // If we have any web presence, consider them potentially real
      isReal = isReal || webPresence.length > 0;

      // Even if verification is low, keep them if they have some presence
      if (webPresence.length > 0 && relevanceScore < 40) {
        relevanceScore = 40; // Minimum score if they have web presence
      }

      console.log(`Verification completed for: ${suggestion.name}, Real: ${isReal}, Score: ${relevanceScore}`);
      return {
        isReal,
        relevanceScore,
        verificationNotes,
        webPresence
      };

    } catch (error) {
      console.error('Verification error:', error);
      // If there was an error but we found some evidence earlier, don't completely reject
      if (webPresence.length > 0) {
        return {
          isReal: true,
          relevanceScore: 40,
          verificationNotes: ['⚠️ Partial verification completed'],
          webPresence
        };
      }
      return {
        isReal: false,
        relevanceScore: 0,
        verificationNotes: ['× Failed to verify person: ' + error],
        webPresence: []
      };
    }
  }

  private async searchWebPresence(query: string): Promise<string[]> {
    try {
      console.log('Searching for:', query);
      const response = await axios.get(this.GOOGLE_API_ENDPOINT, {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: query,
          num: 5
        }
      });

      if (!response.data.items) {
        console.log('No search results found for query:', query);
        return [];
      }

      const results = response.data.items.map((item: any) => item.link);
      console.log('Found results:', results);
      return results;

    } catch (error) {
      console.error('Google search error:', error);
      if (axios.isAxiosError(error)) {
        console.error('Google API response:', error.response?.data);
      }
      return [];
    }
  }
}
