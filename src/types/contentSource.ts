export interface ContentCreator {
  name: string;
  platform: string;
  url: string;
  metrics: Record<string, any>;
  content?: any[];
}

export interface ContentSource {
  name: string;
  findExperts(topic: string): Promise<ContentCreator[]>;
  getMetrics(creator: ContentCreator): Promise<Record<string, number>>;
}
