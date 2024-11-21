export interface SpotifyPodcast {
  id: string;
  name: string;
  description: string;
  publisher: string;
  totalEpisodes: number;
  rating: number | null;
  url: string;
  externalUrls?: {
    spotify?: string;
    youtube?: string;
    apple?: string;
  };
}

export interface SpotifyEpisode {
  id: string;
  name: string;
  description: string;
  releaseDate: Date;
  durationMs: number;
  url: string;
  externalUrls?: {
    spotify?: string;
    youtube?: string;
    apple?: string;
  };
}

export interface SpotifyAppearance {
  podcastName: string;
  episodeName: string;
  date: Date;
  url: string;
  externalUrls?: {
    spotify?: string;
    youtube?: string;
    apple?: string;
  };
  platform: 'spotify' | 'youtube' | 'apple';
}

export interface SpotifyGuest {
  name: string;
  appearances: SpotifyAppearance[];
  topics: string[] | Set<string>;
  totalAppearances: number;
}
