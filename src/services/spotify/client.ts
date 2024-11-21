import axios from 'axios';
import { SpotifyPodcast, SpotifyEpisode, SpotifyGuest } from '../../types/spotify';
import { RateLimiter } from '../utils/rateLimiter';

export class SpotifyClient {
  private accessToken: string | null = null;
  private rateLimiter: RateLimiter;

  constructor(private clientId: string, private clientSecret: string) {
    this.rateLimiter = new RateLimiter();
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'client_credentials'
        }),
        {
          headers: {
            'Authorization': 'Basic ' + Buffer.from(this.clientId + ':' + this.clientSecret).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      this.accessToken = response.data.access_token;
    } catch (error) {
      console.error('Spotify authentication error:', error);
      throw error;
    }
  }

  private async request(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    if (!this.accessToken) {
      await this.authenticate();
    }

    await this.rateLimiter.checkLimit('spotify');
    try {
      const response = await axios.get(`https://api.spotify.com/v1${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        params
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        await this.authenticate();
        return this.request(endpoint, params);
      }
      throw error;
    }
  }

  async findRelevantPodcasts(topic: string): Promise<SpotifyPodcast[]> {
    const data = await this.request('/search', {
      q: topic,
      type: 'show',
      market: 'US',
      limit: 50
    });

    return data.shows.items.map((show: any) => ({
      id: show.id,
      name: show.name,
      description: show.description,
      publisher: show.publisher,
      totalEpisodes: show.total_episodes,
      rating: show.rating || null,
      url: show.external_urls.spotify,
      externalUrls: {
        spotify: show.external_urls.spotify,
        youtube: await this.findExternalUrl(show.name, 'youtube'),
        apple: await this.findExternalUrl(show.name, 'apple'),
      }
    }));
  }

  private async findExternalUrl(podcastName: string, platform: 'youtube' | 'apple'): Promise<string | undefined> {
    try {
      await this.rateLimiter.checkLimit('google');
      const response = await axios.get(
        'https://www.googleapis.com/customsearch/v1',
        {
          params: {
            key: import.meta.env.VITE_GOOGLE_API_KEY,
            cx: import.meta.env.VITE_GOOGLE_CSE_ID,
            q: `${podcastName} podcast ${platform === 'youtube' ? 'channel' : ''}`,
            siteSearch: platform === 'youtube' ? 'youtube.com' : 'podcasts.apple.com',
          },
        }
      );

      if (response.data.items?.[0]) {
        return response.data.items[0].link;
      }
    } catch (error) {
      console.warn(`Error finding ${platform} URL:`, error);
    }
    return undefined;
  }

  async getRecentEpisodes(podcastId: string, limit: number = 50): Promise<SpotifyEpisode[]> {
    const data = await this.request(`/shows/${podcastId}/episodes`, {
      market: 'US',
      limit
    });

    const episodes = await Promise.all(data.items.map(async (episode: any) => ({
      id: episode.id,
      name: episode.name,
      description: episode.description,
      releaseDate: new Date(episode.release_date),
      durationMs: episode.duration_ms,
      url: episode.external_urls.spotify,
      externalUrls: {
        spotify: episode.external_urls.spotify,
        youtube: await this.findExternalUrl(`${episode.name} ${data.name}`, 'youtube'),
        apple: await this.findExternalUrl(`${episode.name} ${data.name}`, 'apple'),
      }
    })));

    return episodes;
  }

  async findPastGuests(topic: string): Promise<SpotifyGuest[]> {
    // Find relevant podcasts
    const podcasts = await this.findRelevantPodcasts(topic);
    const guestMap = new Map<string, SpotifyGuest>();

    // Get episodes and extract guests
    for (const podcast of podcasts) {
      const episodes = await this.getRecentEpisodes(podcast.id, 10);
      
      for (const episode of episodes) {
        const guestNames = this.extractGuestNames(episode.name, episode.description);
        
        for (const guestName of guestNames) {
          if (!guestMap.has(guestName)) {
            guestMap.set(guestName, {
              name: guestName,
              appearances: [],
              topics: new Set(),
              totalAppearances: 0
            });
          }

          const guest = guestMap.get(guestName)!;
          guest.appearances.push({
            podcastName: podcast.name,
            episodeName: episode.name,
            date: episode.releaseDate,
            url: episode.url,
            externalUrls: episode.externalUrls,
            platform: 'spotify'
          });
          guest.totalAppearances++;

          const topics = this.extractTopics(episode.description);
          topics.forEach(topic => guest.topics.add(topic));
        }
      }
    }

    return Array.from(guestMap.values())
      .map(guest => ({
        ...guest,
        topics: Array.from(guest.topics)
      }))
      .sort((a, b) => b.totalAppearances - a.totalAppearances);
  }

  private extractGuestNames(title: string, description: string): string[] {
    const guestIndicators = [
      'with guest',
      'featuring',
      'feat.',
      'ft.',
      'welcomes',
      'joins us',
      'interview with',
      'in conversation with'
    ];

    const names = new Set<string>();

    // Check title and description for guest indicators
    const fullText = `${title} ${description}`.toLowerCase();
    
    guestIndicators.forEach(indicator => {
      const index = fullText.indexOf(indicator);
      if (index !== -1) {
        // Extract the name after the indicator
        const afterIndicator = fullText.slice(index + indicator.length).split(/[,.!?]/)[0];
        const name = afterIndicator.trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (name.length > 0 && !name.includes('Episode') && !name.includes('Season')) {
          names.add(name);
        }
      }
    });

    return Array.from(names);
  }

  private extractTopics(description: string): string[] {
    // Common topic indicators
    const topicIndicators = [
      'discuss',
      'talk about',
      'explore',
      'deep dive into',
      'conversation about',
      'focus on',
      'expert in',
      'specialist in'
    ];

    const topics = new Set<string>();
    const sentences = description.toLowerCase().split(/[.!?]+/);

    sentences.forEach(sentence => {
      topicIndicators.forEach(indicator => {
        if (sentence.includes(indicator)) {
          // Extract the phrase after the indicator
          const afterIndicator = sentence.split(indicator)[1];
          if (afterIndicator) {
            const topic = afterIndicator.split(/[,;]/)
              .map(t => t.trim())
              .filter(t => t.length > 3 && t.length < 50)[0];
            
            if (topic) {
              topics.add(topic.charAt(0).toUpperCase() + topic.slice(1));
            }
          }
        }
      });
    });

    return Array.from(topics);
  }
}
