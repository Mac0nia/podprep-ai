import axios from 'axios';

export class URLValidator {
  private static readonly LINKEDIN_URL_REGEX = /^https:\/\/(?:www\.)?linkedin\.com\/(?:in|company)\/[\w-]+\/?$/;
  private static readonly TWITTER_URL_REGEX = /^https:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/[\w-]+\/?$/;
  private static readonly INSTAGRAM_URL_REGEX = /^https:\/\/(?:www\.)?instagram\.com\/[\w.-]+\/?$/;

  private static readonly PLATFORM_DOMAINS = {
    linkedin: ['linkedin.com'],
    twitter: ['twitter.com', 'x.com'],
    instagram: ['instagram.com']
  };

  /**
   * Validates a LinkedIn URL format
   */
  static isValidLinkedInFormat(url: string): boolean {
    return this.LINKEDIN_URL_REGEX.test(url);
  }

  /**
   * Validates a Twitter URL format
   */
  static isValidTwitterFormat(url: string): boolean {
    return this.TWITTER_URL_REGEX.test(url);
  }

  /**
   * Validates an Instagram URL format
   */
  static isValidInstagramFormat(url: string): boolean {
    return this.INSTAGRAM_URL_REGEX.test(url);
  }

  /**
   * Determines the platform of a social media URL
   */
  static getPlatform(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');

      for (const [platform, domains] of Object.entries(this.PLATFORM_DOMAINS)) {
        if (domains.includes(hostname)) {
          return platform;
        }
      }
    } catch (e) {
      // Invalid URL format
    }
    return null;
  }

  /**
   * Normalizes a LinkedIn URL to a standard format
   */
  static normalizeLinkedInURL(url: string): string {
    try {
      const urlObj = new URL(url);
      const path = urlObj.pathname.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes
      return `https://linkedin.com/${path}`;
    } catch (e) {
      return url;
    }
  }

  /**
   * Checks if a URL exists by making a HEAD request
   */
  static async urlExists(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status === 200 || status === 404
      });
      return response.status === 200;
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates and normalizes a social media URL
   */
  static async validateAndNormalizeURL(url: string): Promise<{
    isValid: boolean;
    normalizedURL?: string;
    platform?: string;
    error?: string;
  }> {
    // Check if URL is provided
    if (!url) {
      return { isValid: false, error: 'URL is required' };
    }

    // Determine platform and check format
    const platform = this.getPlatform(url);
    if (!platform) {
      return { isValid: false, error: 'Invalid social media platform' };
    }

    let isValidFormat = false;
    let normalizedURL = url;

    switch (platform) {
      case 'linkedin':
        isValidFormat = this.isValidLinkedInFormat(url);
        normalizedURL = this.normalizeLinkedInURL(url);
        break;
      case 'twitter':
        isValidFormat = this.isValidTwitterFormat(url);
        break;
      case 'instagram':
        isValidFormat = this.isValidInstagramFormat(url);
        break;
    }

    if (!isValidFormat) {
      return { 
        isValid: false, 
        error: `Invalid ${platform} URL format`,
        platform 
      };
    }

    return {
      isValid: true,
      normalizedURL,
      platform
    };
  }
}
