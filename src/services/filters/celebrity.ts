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
  private cache: Map<string, boolean>;

  // Initialize well-known figures from the generated list
  private readonly WELL_KNOWN_FIGURES: Map<string, boolean>;

  constructor() {
    this.rateLimiter = new RateLimiter();
    this.cache = new Map();

    // Create a map of normalized names to their details
    this.WELL_KNOWN_FIGURES = new Map(
      wellKnownFigures.map(figure => [
        figure.name.toLowerCase(),
        true
      ])
    );
  }

  private async checkWikipedia(name: string): Promise<boolean> {
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
        return false;
      }

      const article = response.data.query.search[0];
      
      // Check for specific keywords that indicate celebrity status
      const celebrityKeywords = [
        'billionaire', 'entrepreneur', 'ceo', 'founder', 'executive',
        'actor', 'actress', 'musician', 'singer', 'celebrity', 'star',
        'producer', 'director', 'artist', 'performer',
        'influencer', 'youtuber', 'streamer', 'content creator',
        'famous', 'renowned', 'notable', 'prominent', 'distinguished',
        'philanthropist', 'investor', 'public figure', 'media personality',
        'tech executive', 'silicon valley', 'startup founder',
        'award-winning', 'bestselling', 'acclaimed',
        'social media entrepreneur', 'digital marketing guru', 'business guru',
        'keynote speaker', 'motivational speaker', 'thought leader',
        'business influencer', 'marketing influencer', 'social media expert',
        'VaynerMedia', 'Wine Library', 'serial entrepreneur'
      ];

      const hasKeywords = celebrityKeywords.some(keyword => 
        article.snippet.toLowerCase().includes(keyword.toLowerCase())
      );

      // Check for specific achievements
      const achievementKeywords = [
        'forbes', 'time 100', 'fortune 500', 'grammy', 'oscar', 'emmy',
        'nobel', 'pulitzer', 'world record', 'hall of fame',
        'bestselling author', 'ted talk', 'tedx', 'keynote',
        'inc 500', 'shark tank', 'dragons den', 'y combinator',
        'web summit', 'sxsw', 'social media week'
      ];

      const hasAchievements = achievementKeywords.some(keyword => 
        article.snippet.toLowerCase().includes(keyword.toLowerCase())
      );

      return (article.wordcount > 2000 && hasKeywords) || hasAchievements;
    } catch (error) {
      console.warn('Wikipedia API error:', error);
      return false;
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
            q: `"${name}" (site:twitter.com OR site:x.com OR site:instagram.com OR site:linkedin.com OR site:youtube.com OR site:tiktok.com)`,
            num: 10,
          },
        }
      );

      for (const item of response.data.items || []) {
        // Check for social media follower counts in snippets
        const followerMatch = item.snippet.match(/(\d+(?:[.,]\d+)*[KMB]?)\s*(?:Followers|Following|followers|connections|subscribers)/i);
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

          // Lower the threshold for business influencers and entrepreneurs
          const businessInfluencerKeywords = [
            'entrepreneur', 'founder', 'ceo', 'investor', 'speaker',
            'author', 'expert', 'guru', 'consultant', 'advisor'
          ];
          
          const isBusinessInfluencer = businessInfluencerKeywords.some(keyword => 
            item.snippet.toLowerCase().includes(keyword.toLowerCase())
          );

          // Use a lower threshold for business influencers
          const threshold = isBusinessInfluencer ? 500000 : 2000000;
          
          if (count > threshold) {
            let platform = 'Social Media';
            if (item.link.includes('twitter.com') || item.link.includes('x.com')) {
              platform = 'Twitter/X';
            } else if (item.link.includes('instagram.com')) {
              platform = 'Instagram';
            } else if (item.link.includes('linkedin.com')) {
              platform = 'LinkedIn';
            } else if (item.link.includes('youtube.com')) {
              platform = 'YouTube';
            } else if (item.link.includes('tiktok.com')) {
              platform = 'TikTok';
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

  private async checkNewsPresence(name: string): Promise<boolean> {
    try {
      await this.rateLimiter.checkLimit('google');
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: import.meta.env.VITE_GOOGLE_API_KEY,
            cx: import.meta.env.VITE_GOOGLE_CSE_ID,
            q: `"${name}"`,
            dateRestrict: 'y1',
            sort: 'date',
          },
        }
      );

      const totalResults = parseInt(response.data.searchInformation.totalResults);
      
      const qualityNewsSources = [
        'techcrunch.com', 'wired.com', 'theverge.com', 'cnet.com',
        'venturebeat.com', 'arstechnica.com',
        'forbes.com', 'bloomberg.com', 'reuters.com', 'wsj.com',
        'ft.com', 'cnbc.com', 'businessinsider.com',
        'nytimes.com', 'washingtonpost.com', 'theguardian.com',
        'bbc.com', 'cnn.com', 'apnews.com', 'reuters.com',
        'variety.com', 'hollywoodreporter.com', 'deadline.com',
        'billboard.com', 'rollingstone.com'
      ];

      const qualityNewsCount = (response.data.items || []).filter(
        (item: any) => qualityNewsSources.some(domain => item.link.includes(domain))
      ).length;

      const recentMajorCoverage = (response.data.items || []).some((item: any) => {
        const isQualitySource = qualityNewsSources.some(domain => item.link.includes(domain));
        const hasHeadlineKeywords = [
          'announces', 'launches', 'reveals', 'joins', 'leads',
          'raises', 'acquires', 'wins', 'receives', 'appointed'
        ].some(keyword => item.title.toLowerCase().includes(keyword));
        return isQualitySource && hasHeadlineKeywords;
      });

      return totalResults > 1000 || qualityNewsCount >= 3 || recentMajorCoverage;
    } catch (error) {
      console.warn('Google News API error:', error);
      return false;
    }
  }

  async isCelebrity(name: string): Promise<boolean> {
    try {
      const normalizedName = name.toLowerCase().trim();

      // Check cache first
      if (this.cache.has(normalizedName)) {
        return this.cache.get(normalizedName)!;
      }

      // Check well-known figures list first
      const wellKnownFigure = this.WELL_KNOWN_FIGURES.get(normalizedName);
      if (wellKnownFigure) {
        this.cache.set(normalizedName, wellKnownFigure);
        return wellKnownFigure;
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
        boolean,
        { isInfluencer: boolean; followerCount?: number; platform?: string },
        boolean
      ];

      // Immediately exclude if over 2M followers
      if (socialInfo.isInfluencer) {
        this.cache.set(normalizedName, true);
        return true;
      }

      // More stringent celebrity check - require both Wikipedia and news presence
      const isCeleb = wikiInfo && newsInfo;
      this.cache.set(normalizedName, isCeleb);
      return isCeleb;
    } catch (error) {
      console.warn('Celebrity check error:', error);
      // Default to not a celebrity on error
      return false;
    }
  }

  async filterCelebrities<T extends { name: string }>(
    guests: T[],
    onProgress?: (filtered: number, total: number) => void
  ): Promise<{
    filtered: T[];
    excluded: T[];
  }> {
    const filtered: T[] = [];
    const excluded: T[] = [];
    let processed = 0;

    // Process in smaller batches to prevent overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < guests.length; i += batchSize) {
      const batch = guests.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async (guest) => {
          try {
            const isCelebrity = await this.isCelebrity(guest.name);
            if (!isCelebrity) {
              filtered.push(guest);
            } else {
              excluded.push(guest);
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
