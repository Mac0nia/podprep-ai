import axios from 'axios';
import { RateLimiter } from '../utils/rateLimiter';
import wellKnownFigures from '../../data/well-known-figures.json';

interface WikipediaResponse {
  query?: {
    search?: Array<{
      title: string;
      snippet: string;
      wordcount: number;
    }>;
  };
}

export class CelebrityFilter {
  private rateLimiter: RateLimiter;
  private cache: Map<string, {
    isCelebrity: boolean;
    reason?: string;
    details?: {
      platform?: string;
      followers?: number;
      category?: string;
    };
  }>;

  // Initialize well-known figures from the generated list
  private readonly WELL_KNOWN_FIGURES: Map<string, {
    category: string;
    reason: string;
  }>;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.cache = new Map();

    // Create a map of normalized names to their details
    this.WELL_KNOWN_FIGURES = new Map(
      wellKnownFigures.map(figure => [
        figure.name.toLowerCase(),
        {
          category: figure.category,
          reason: figure.reason
        }
      ])
    );
  }

  private async checkWikipedia(name: string): Promise<{
    isCelebrity: boolean;
    reason?: string;
  }> {
    try {
      await this.rateLimiter.checkLimit('wikipedia');
      const response = await axios.get<WikipediaResponse>(
        'https://en.wikipedia.org/w/api.php',
        {
          params: {
            action: 'query',
            list: 'search',
            srsearch: name,
            format: 'json',
            origin: '*',
          },
        }
      );

      if (!response.data.query?.search?.length) {
        return { isCelebrity: false };
      }

      const article = response.data.query.search[0];
      
      // Check for specific keywords that indicate celebrity status
      const celebrityKeywords = [
        // Business and Tech
        'billionaire', 'entrepreneur', 'ceo', 'founder', 'executive',
        // Entertainment
        'actor', 'actress', 'musician', 'singer', 'celebrity', 'star',
        'producer', 'director', 'artist', 'performer',
        // Social Media
        'influencer', 'youtuber', 'streamer', 'content creator',
        // General Fame
        'famous', 'renowned', 'notable', 'prominent', 'distinguished',
        // Specific Roles
        'philanthropist', 'investor', 'public figure', 'media personality',
        // Tech Specific
        'tech executive', 'silicon valley', 'startup founder',
        // Achievement Indicators
        'award-winning', 'bestselling', 'acclaimed'
      ];

      const hasKeywords = celebrityKeywords.some(keyword => 
        article.snippet.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check for specific achievements or indicators
      const achievementKeywords = [
        'forbes', 'time 100', 'fortune 500', 'grammy', 'oscar', 'emmy',
        'nobel', 'pulitzer', 'world record', 'hall of fame'
      ];

      const hasAchievements = achievementKeywords.some(keyword => 
        article.snippet.toLowerCase().includes(keyword.toLowerCase())
      );

      const isCelebrity = (article.wordcount > 2000 && hasKeywords) || hasAchievements;
      return {
        isCelebrity,
        reason: isCelebrity 
          ? hasAchievements 
            ? 'Notable figure with significant achievements'
            : 'Has substantial Wikipedia presence with notable status'
          : undefined
      };
    } catch (error) {
      console.warn('Wikipedia API error:', error);
      return { isCelebrity: false };
    }
  }

  private async checkSocialFollowers(name: string): Promise<{
    isInfluencer: boolean;
    followerCount?: number;
    platform?: string;
  }> {
    try {
      // First try a combined search to minimize API calls
      await this.rateLimiter.checkLimit('google');
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: import.meta.env.VITE_GOOGLE_API_KEY,
            cx: import.meta.env.VITE_GOOGLE_CSE_ID,
            q: `"${name}" (site:twitter.com OR site:x.com OR site:instagram.com OR site:linkedin.com)`,
            num: 10,
          },
        }
      );

      for (const item of response.data.items || []) {
        // Check for social media follower counts in snippets
        const followerMatch = item.snippet.match(/(\d+(?:[.,]\d+)*[KMB]?)\s*(?:Followers|Following|followers|connections)/i);
        if (followerMatch) {
          let followers = followerMatch[1].replace(/,/g, '');
          let count = 0;
          
          // Convert K, M, B to numbers
          if (followers.endsWith('K')) {
            count = parseFloat(followers) * 1000;
          } else if (followers.endsWith('M')) {
            count = parseFloat(followers) * 1000000;
          } else if (followers.endsWith('B')) {
            count = parseFloat(followers) * 1000000000;
          } else {
            count = parseFloat(followers);
          }

          if (count > 2000000) {
            let platform = 'Social Media';
            if (item.link.includes('twitter.com') || item.link.includes('x.com')) {
              platform = 'Twitter/X';
            } else if (item.link.includes('instagram.com')) {
              platform = 'Instagram';
            } else if (item.link.includes('linkedin.com')) {
              platform = 'LinkedIn';
            }

            return {
              isInfluencer: true,
              followerCount: count,
              platform
            };
          }
        }
      }

      return { isInfluencer: false };
    } catch (error) {
      console.warn('Social media check error:', error);
      // Don't fail the entire search if social check fails
      return { isInfluencer: false };
    }
  }

  private async checkNewsPresence(name: string): Promise<{
    isCelebrity: boolean;
    reason?: string;
  }> {
    try {
      await this.rateLimiter.checkLimit('google');
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: import.meta.env.VITE_GOOGLE_API_KEY,
            cx: import.meta.env.VITE_GOOGLE_CSE_ID,
            q: `"${name}"`,
            dateRestrict: 'y1', // Last year
            sort: 'date',
          },
        }
      );

      const totalResults = parseInt(response.data.searchInformation.totalResults);
      
      // Check if there are many high-quality news sources
      const qualityNewsSources = [
        // Tech News
        'techcrunch.com', 'wired.com', 'theverge.com', 'cnet.com',
        'venturebeat.com', 'arstechnica.com',
        // Business News
        'forbes.com', 'bloomberg.com', 'reuters.com', 'wsj.com',
        'ft.com', 'cnbc.com', 'businessinsider.com',
        // General News
        'nytimes.com', 'washingtonpost.com', 'theguardian.com',
        'bbc.com', 'cnn.com', 'apnews.com', 'reuters.com',
        // Industry Specific
        'variety.com', 'hollywoodreporter.com', 'deadline.com',
        'billboard.com', 'rollingstone.com'
      ];

      const qualityNewsCount = (response.data.items || []).filter(
        (item: any) => qualityNewsSources.some(domain => item.link.includes(domain))
      ).length;

      // Check for recent major coverage
      const recentMajorCoverage = (response.data.items || []).some((item: any) => {
        const isQualitySource = qualityNewsSources.some(domain => item.link.includes(domain));
        const hasHeadlineKeywords = [
          'announces', 'launches', 'reveals', 'joins', 'leads',
          'raises', 'acquires', 'wins', 'receives', 'appointed'
        ].some(keyword => item.title.toLowerCase().includes(keyword));
        return isQualitySource && hasHeadlineKeywords;
      });

      const isCelebrity = totalResults > 1000 || qualityNewsCount >= 3 || recentMajorCoverage;
      
      let reason;
      if (isCelebrity) {
        if (totalResults > 1000) {
          reason = 'Has extensive media coverage';
        } else if (qualityNewsCount >= 3) {
          reason = 'Featured in multiple major news outlets';
        } else {
          reason = 'Has recent significant media coverage';
        }
      }

      return { isCelebrity, reason };
    } catch (error) {
      console.warn('Google News API error:', error);
      return { isCelebrity: false };
    }
  }

  async isCelebrity(name: string): Promise<{
    isCelebrity: boolean;
    reason?: string;
    details?: {
      platform?: string;
      followers?: number;
      category?: string;
    };
  }> {
    try {
      const normalizedName = name.toLowerCase().trim();

      // Check cache first
      if (this.cache.has(normalizedName)) {
        return this.cache.get(normalizedName)!;
      }

      // Check well-known figures list first
      const wellKnownFigure = this.WELL_KNOWN_FIGURES.get(normalizedName);
      if (wellKnownFigure) {
        const result = {
          isCelebrity: true,
          reason: wellKnownFigure.reason,
          details: {
            category: wellKnownFigure.category
          }
        };
        this.cache.set(normalizedName, result);
        return result;
      }

      // Add timeout to prevent hanging
      const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Celebrity check timed out')), 10000)
      );

      const checkPromise = Promise.all([
        this.checkWikipedia(name),
        this.checkSocialFollowers(name),
        this.checkNewsPresence(name),
      ]);

      const [wikiInfo, socialInfo, newsInfo] = await Promise.race([
        checkPromise,
        timeout
      ]) as [
        { isCelebrity: boolean; reason?: string },
        { isInfluencer: boolean; followerCount?: number; platform?: string },
        { isCelebrity: boolean; reason?: string }
      ];

      // Immediately exclude if over 2M followers
      if (socialInfo.isInfluencer) {
        const result = {
          isCelebrity: true,
          reason: `Has over 2M followers on ${socialInfo.platform}`,
          details: {
            platform: socialInfo.platform,
            followers: socialInfo.followerCount
          }
        };
        this.cache.set(normalizedName, result);
        return result;
      }

      // More stringent celebrity check - require both Wikipedia and news presence
      const isCeleb = wikiInfo.isCelebrity && newsInfo.isCelebrity;
      const result = {
        isCelebrity: isCeleb,
        reason: isCeleb ? `${wikiInfo.reason} and ${newsInfo.reason}` : undefined
      };

      this.cache.set(normalizedName, result);
      return result;
    } catch (error) {
      console.warn('Celebrity check error:', error);
      // Default to not a celebrity on error
      return { isCelebrity: false };
    }
  }

  async filterCelebrities<T extends { name: string }>(
    guests: T[],
    onProgress?: (filtered: number, total: number) => void
  ): Promise<{
    filtered: T[];
    excluded: Array<{
      guest: T;
      reason: string;
      details?: {
        platform?: string;
        followers?: number;
        category?: string;
      };
    }>;
  }> {
    const filtered: T[] = [];
    const excluded: Array<{
      guest: T;
      reason: string;
      details?: {
        platform?: string;
        followers?: number;
        category?: string;
      };
    }> = [];
    let processed = 0;

    // Process in smaller batches to prevent overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < guests.length; i += batchSize) {
      const batch = guests.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (guest) => {
          try {
            const { isCelebrity, reason, details } = await this.isCelebrity(guest.name);
            if (!isCelebrity) {
              filtered.push(guest);
            } else if (reason) {
              excluded.push({ guest, reason, details });
            }
            processed++;
            onProgress?.(processed, guests.length);
          } catch (error) {
            console.warn(`Error processing guest ${guest.name}:`, error);
            // On error, include the guest (benefit of the doubt)
            filtered.push(guest);
            processed++;
            onProgress?.(processed, guests.length);
          }
        })
      );

      // Add a small delay between batches to prevent rate limiting
      if (i + batchSize < guests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return { filtered, excluded };
  }

  clearCache() {
    this.cache.clear();
  }
}