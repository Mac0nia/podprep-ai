import axios from 'axios';
import { RateLimiter } from '../utils/rateLimiter';

export interface AIProvider {
  name: string;
  isAvailable: () => boolean;
  analyze: (prompt: string) => Promise<string>;
}

export class OpenAIProvider implements AIProvider {
  private apiKey: string;
  private model: string;
  private rateLimiter: RateLimiter;

  constructor() {
    this.apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    this.model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-3.5-turbo';
    this.rateLimiter = new RateLimiter();
  }

  name = 'OpenAI';

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async analyze(prompt: string): Promise<string> {
    await this.rateLimiter.checkLimit('openai');
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: this.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2048,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
}

export class AIClient {
  private providers: AIProvider[];
  private currentProviderIndex: number;

  constructor() {
    this.providers = [
      new OpenAIProvider(),
    ].filter(provider => provider.isAvailable());
    
    this.currentProviderIndex = 0;
  }

  private async tryNextProvider(): Promise<AIProvider | null> {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    return this.providers[this.currentProviderIndex] || null;
  }

  async analyze(prompt: string): Promise<string> {
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured. Please add API keys in .env file.');
    }

    let attempts = 0;
    const maxAttempts = this.providers.length;
    let lastError: Error | null = null;

    while (attempts < maxAttempts) {
      const provider = this.providers[this.currentProviderIndex];
      try {
        console.log(`Attempting analysis with ${provider.name}...`);
        const result = await provider.analyze(prompt);
        return result;
      } catch (error: any) {
        console.warn(`${provider.name} failed:`, error.message);
        lastError = error;
        const nextProvider = await this.tryNextProvider();
        if (!nextProvider) break;
        attempts++;
      }
    }

    throw new Error(`All AI providers failed. Last error: ${lastError?.message}`);
  }

  getCurrentProvider(): string {
    return this.providers[this.currentProviderIndex]?.name || 'None';
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}
