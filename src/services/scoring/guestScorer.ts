import { GuestSuggestion } from '../../types/guest';

export interface GuestScore {
  total: number;
  breakdown: {
    relevance: number;     // How well they match the topic
    authority: number;     // Their expertise level
    engagement: number;    // Social media engagement
    recency: number;      // Recent activity
    reach: number;        // Audience size
  };
  flags: string[];        // Any special notes or warnings
}

export interface SocialMetrics {
  followers: number;
  posts: number;
  engagement: number;
}

export class GuestScorer {
  private static readonly MINIMUM_SCORES = {
    total: 65,              // Minimum total score to be considered
    relevance: 15,          // Must be relevant to topic
    authority: 10,          // Must have some expertise
    engagement: 5,          // Must have some engagement
    followers: {
      linkedin: 500,        // Minimum LinkedIn followers
      twitter: 1000,        // Minimum Twitter followers
    }
  };

  private static readonly WEIGHTS = {
    relevance: 0.3,         // 30% of total score
    authority: 0.25,        // 25% of total score
    engagement: 0.2,        // 20% of total score
    recency: 0.15,         // 15% of total score
    reach: 0.1             // 10% of total score
  };

  static async scoreGuest(
    guest: GuestSuggestion,
    topic: string,
    socialMetrics?: SocialMetrics
  ): Promise<GuestScore> {
    const flags: string[] = [];
    const breakdown = {
      relevance: 0,
      authority: 0,
      engagement: 0,
      recency: 0,
      reach: 0
    };

    // Score Topic Relevance (0-100)
    breakdown.relevance = this.scoreRelevance(guest, topic);
    if (breakdown.relevance < this.MINIMUM_SCORES.relevance) {
      flags.push('Low topic relevance');
    }

    // Score Authority (0-100)
    breakdown.authority = this.scoreAuthority(guest);
    if (breakdown.authority < this.MINIMUM_SCORES.authority) {
      flags.push('Limited expertise evidence');
    }

    // Score Engagement and Reach
    if (socialMetrics) {
      const socialScores = this.scoreSocialPresence(socialMetrics);
      breakdown.engagement = socialScores.engagement;
      breakdown.reach = socialScores.reach;
      
      if (socialMetrics.followers < this.MINIMUM_SCORES.followers.linkedin) {
        flags.push('Low follower count');
      }
    }

    // Score Recency
    breakdown.recency = await this.scoreRecency(guest);

    // Calculate Total Score (weighted average)
    const total = Object.entries(this.WEIGHTS).reduce((sum, [key, weight]) => {
      return sum + (breakdown[key as keyof typeof breakdown] * weight);
    }, 0);

    return {
      total,
      breakdown,
      flags
    };
  }

  private static scoreRelevance(guest: GuestSuggestion, topic: string): number {
    let score = 0;
    const topics = topic.toLowerCase().split(',').map(t => t.trim());
    
    // Core expertise match (up to 40 points)
    const expertiseMatches = guest.expertise.filter(e => 
      topics.some(t => e.toLowerCase().includes(t))
    ).length;
    score += Math.min(40, expertiseMatches * 20);
    
    // Title relevance (up to 30 points)
    const titleScore = topics.reduce((sum, t) => {
      if (guest.title.toLowerCase().includes(t)) sum += 15;
      if (guest.company.toLowerCase().includes(t)) sum += 15;
      return sum;
    }, 0);
    score += Math.min(30, titleScore);
    
    // Bio relevance (up to 30 points)
    const bioScore = topics.reduce((sum, t) => {
      // Direct mention
      if (guest.bio.toLowerCase().includes(t)) sum += 10;
      // Related terms
      const relatedTerms = this.getRelatedTerms(t);
      sum += relatedTerms.filter(term => 
        guest.bio.toLowerCase().includes(term)
      ).length * 5;
      return sum;
    }, 0);
    score += Math.min(30, bioScore);

    return Math.min(100, score);
  }

  private static getRelatedTerms(topic: string): string[] {
    const relatedTermsMap = {
      'startup': ['entrepreneur', 'founder', 'venture', 'seed', 'series a', 'startup', 'innovation'],
      'entrepreneurship': ['business', 'founder', 'ceo', 'startup', 'venture', 'entrepreneurial'],
      'technology': ['tech', 'software', 'digital', 'innovation', 'ai', 'platform'],
      'marketing': ['growth', 'brand', 'digital marketing', 'advertising', 'content'],
      'leadership': ['management', 'executive', 'strategy', 'ceo', 'director'],
      'innovation': ['innovative', 'disruption', 'breakthrough', 'cutting-edge', 'pioneer'],
      // Add more mappings as needed
    };
    
    return relatedTermsMap[topic as keyof typeof relatedTermsMap] || [];
  }

  private static scoreAuthority(guest: GuestSuggestion): number {
    let score = 0;
    
    // Leadership role
    if (/CEO|Founder|Director|Head|Chief|Partner/i.test(guest.title)) {
      score += 30;
    }
    
    // Years of experience (if available)
    const yearsMatch = guest.bio.match(/(\d+)\+?\s*years?/i);
    if (yearsMatch) {
      const years = parseInt(yearsMatch[1]);
      score += Math.min(30, years * 2);
    }
    
    // Published work or speaking
    if (/author|speaker|published|keynote/i.test(guest.bio)) {
      score += 20;
    }
    
    // Industry recognition
    if (/award|featured|recognized|expert/i.test(guest.bio)) {
      score += 20;
    }

    return Math.min(100, score);
  }

  private static scoreSocialPresence(metrics: SocialMetrics): {
    engagement: number;
    reach: number;
  } {
    // Engagement Score (0-100)
    // Base: 2% engagement is average, 5% is excellent
    let engagement = 0;
    if (metrics.engagement >= 0.05) {
      engagement = 100;  // 5%+ engagement rate
    } else if (metrics.engagement >= 0.02) {
      engagement = 60 + ((metrics.engagement - 0.02) / 0.03) * 40;  // 2-5% scaled
    } else {
      engagement = (metrics.engagement / 0.02) * 60;  // 0-2% scaled
    }

    // Reach Score (0-100)
    // Logarithmic scale for followers
    let reach = 0;
    if (metrics.followers <= 500) {
      reach = (metrics.followers / 500) * 20;  // 0-500 followers: 0-20 points
    } else if (metrics.followers <= 5000) {
      reach = 20 + ((metrics.followers - 500) / 4500) * 30;  // 501-5k: 20-50 points
    } else if (metrics.followers <= 50000) {
      reach = 50 + ((metrics.followers - 5000) / 45000) * 30;  // 5k-50k: 50-80 points
    } else {
      reach = 80 + Math.min(20, ((metrics.followers - 50000) / 950000) * 20);  // 50k+: 80-100 points
    }

    return {
      engagement: Math.round(engagement),
      reach: Math.round(reach)
    };
  }

  private static async scoreRecency(guest: GuestSuggestion): Promise<number> {
    let score = 0;
    
    // Recent activity (within last 3 months)
    if (guest.lastActive && new Date(guest.lastActive) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)) {
      score += 50;
    }
    
    // Recent posts or appearances
    if (guest.pastPodcasts && guest.pastPodcasts.length > 0) {
      score += Math.min(50, guest.pastPodcasts.length * 10);
    }

    return score;
  }

  static isQualifiedGuest(score: GuestScore): boolean {
    return (
      score.total >= this.MINIMUM_SCORES.total &&
      score.breakdown.relevance >= this.MINIMUM_SCORES.relevance &&
      score.breakdown.authority >= this.MINIMUM_SCORES.authority &&
      score.breakdown.engagement >= this.MINIMUM_SCORES.engagement
    );
  }
}
