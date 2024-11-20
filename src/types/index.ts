export interface Episode {
  id: string;
  title: string;
  description: string;
  recordingDate: Date;
  duration: number;
  status: 'draft' | 'recorded' | 'editing' | 'published';
}

export interface Guest {
  id: string;
  name: string;
  bio: string;
  expertise: string[];
  socialMedia: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  pastEpisodes?: string[];
}

export interface ShowNotes {
  episodeId: string;
  keyPoints: string[];
  summary: string;
  topics: string[];
  references: string[];
  timestamp: Record<string, string>;
}

export interface ContentPiece {
  id: string;
  episodeId: string;
  type: 'clip' | 'post' | 'newsletter';
  content: string;
  platform: 'twitter' | 'linkedin' | 'instagram' | 'email';
  status: 'draft' | 'scheduled' | 'published';
}

export interface Analytics {
  episodeId: string;
  listenerCount: number;
  engagement: {
    likes: number;
    shares: number;
    comments: number;
  };
  demographics: {
    regions: Record<string, number>;
    ageGroups: Record<string, number>;
  };
}
