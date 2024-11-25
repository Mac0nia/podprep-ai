import axios from 'axios';
import { PodcastAppearance } from '../../types/guest';

export class PodcastAppearanceSearcher {
  private googleApiKey: string;
  private googleSearchEngineId: string;

  constructor(googleApiKey: string, googleSearchEngineId: string) {
    this.googleApiKey = googleApiKey;
    this.googleSearchEngineId = googleSearchEngineId;
  }

  async findPodcastAppearances(name: string, company: string): Promise<PodcastAppearance[]> {
    const appearances: PodcastAppearance[] = [];
    
    try {
      // Search for podcast appearances
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: `"${name}" "${company}" (podcast OR interview OR youtube) -site:linkedin.com -site:twitter.com`,
          num: 10,
          dateRestrict: 'y2' // Last 2 years
        }
      });

      if (response.data.items) {
        for (const item of response.data.items) {
          const appearance = this.parseSearchResult(item);
          if (appearance) {
            appearances.push(appearance);
          }
        }
      }

      // Additional YouTube search
      const youtubeResponse = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: this.googleApiKey,
          cx: this.googleSearchEngineId,
          q: `"${name}" "${company}" site:youtube.com interview`,
          num: 5
        }
      });

      if (youtubeResponse.data.items) {
        for (const item of youtubeResponse.data.items) {
          const appearance = this.parseSearchResult(item, 'YouTube');
          if (appearance) {
            appearances.push(appearance);
          }
        }
      }

    } catch (error) {
      console.error('Error searching podcast appearances:', error);
    }

    return this.deduplicateAppearances(appearances);
  }

  private parseSearchResult(item: any, defaultPlatform: 'YouTube' | 'Spotify' | 'Apple Podcasts' | 'Other' = 'Other'): PodcastAppearance | null {
    const url = item.link;
    const title = item.title;
    const description = item.snippet;
    
    // Skip if it doesn't look like a podcast/interview
    if (!this.looksLikePodcast(title, description)) {
      return null;
    }

    // Determine platform
    let platform = defaultPlatform;
    if (url.includes('youtube.com')) {
      platform = 'YouTube';
    } else if (url.includes('spotify.com')) {
      platform = 'Spotify';
    } else if (url.includes('apple.com/podcasts')) {
      platform = 'Apple Podcasts';
    }

    // Extract date if available
    const dateMatch = description.match(/\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/i);
    const date = dateMatch ? dateMatch[0] : undefined;

    // Split title into podcast name and episode title
    const [podcastName, episodeTitle] = this.splitPodcastTitle(title);

    return {
      podcastName,
      episodeTitle,
      url,
      date,
      platform,
      description: description.substring(0, 150) + '...' // Truncate description
    };
  }

  private looksLikePodcast(title: string, description: string): boolean {
    const podcastTerms = ['podcast', 'episode', 'interview', 'show', 'talks', 'speaks'];
    const content = (title + ' ' + description).toLowerCase();
    return podcastTerms.some(term => content.includes(term));
  }

  private splitPodcastTitle(title: string): [string, string] {
    // Common podcast title separators
    const separators = [' - ', ' | ', ' : ', ': ', ' • '];
    
    for (const separator of separators) {
      if (title.includes(separator)) {
        const [podcastName, episodeTitle] = title.split(separator);
        return [podcastName.trim(), episodeTitle.trim()];
      }
    }
    
    // If no separator found, use the whole title as podcast name
    return [title, ''];
  }

  private deduplicateAppearances(appearances: PodcastAppearance[]): PodcastAppearance[] {
    const seen = new Set<string>();
    return appearances.filter(appearance => {
      const key = appearance.url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
