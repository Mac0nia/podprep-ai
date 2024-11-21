import { CelebrityFilter } from '../filters/celebrity';
import { SpotifyGuest } from '../../types/spotify';

export class GuestFilter {
  private celebrityFilter: CelebrityFilter;

  constructor() {
    this.celebrityFilter = new CelebrityFilter();
  }

  async filterGuests(
    guests: SpotifyGuest[],
    options: {
      excludeCelebrities?: boolean;
      minAppearances?: number;
      maxAppearances?: number;
      requiredTopics?: string[];
      onProgress?: (filtered: number, total: number) => void;
    } = {}
  ): Promise<SpotifyGuest[]> {
    const {
      excludeCelebrities = true,
      minAppearances = 2,
      maxAppearances = 20,
      requiredTopics = [],
      onProgress,
    } = options;

    let filtered = guests;

    // Filter by appearance count
    filtered = filtered.filter(
      guest => 
        guest.totalAppearances >= minAppearances && 
        guest.totalAppearances <= maxAppearances
    );

    // Filter by required topics
    if (requiredTopics.length > 0) {
      filtered = filtered.filter(guest => {
        const guestTopics = Array.isArray(guest.topics) 
          ? guest.topics 
          : Array.from(guest.topics);
        return requiredTopics.some(topic => 
          guestTopics.some(t => 
            t.toLowerCase().includes(topic.toLowerCase())
          )
        );
      });
    }

    // Filter out celebrities
    if (excludeCelebrities) {
      filtered = await this.celebrityFilter.filterCelebrities(filtered, onProgress);
    }

    return filtered;
  }

  clearCache() {
    this.celebrityFilter.clearCache();
  }
}
