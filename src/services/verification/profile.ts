import { ProfileResult, GuestSuggestion } from '../../types/guest';

export class ProfileVerificationService {
  async verifyAndCombineProfiles(linkedinProfiles: ProfileResult[], twitterProfiles: ProfileResult[]): Promise<GuestSuggestion[]> {
    const verifiedProfiles: GuestSuggestion[] = [];
    
    // First, try to match profiles across platforms
    const matchedProfiles = this.matchProfiles(linkedinProfiles, twitterProfiles);
    
    // Then verify and convert each matched profile
    for (const profile of matchedProfiles) {
      const verifiedProfile = await this.verifyProfile(profile);
      if (verifiedProfile) {
        verifiedProfiles.push(verifiedProfile);
      }
    }
    
    return verifiedProfiles;
  }

  private matchProfiles(linkedinProfiles: ProfileResult[], twitterProfiles: ProfileResult[]): ProfileResult[] {
    const combinedProfiles: ProfileResult[] = [];
    
    // Start with LinkedIn profiles as they typically have more professional info
    for (const linkedinProfile of linkedinProfiles) {
      // Try to find matching Twitter profile
      const matchingTwitterProfile = twitterProfiles.find(tp => 
        this.profilesMatch(linkedinProfile, tp)
      );
      
      if (matchingTwitterProfile) {
        // Combine the profiles
        combinedProfiles.push(this.mergeProfiles(linkedinProfile, matchingTwitterProfile));
      } else {
        // Include LinkedIn profile alone
        combinedProfiles.push(linkedinProfile);
      }
    }
    
    // Add remaining Twitter profiles that didn't match any LinkedIn profiles
    for (const twitterProfile of twitterProfiles) {
      const hasMatch = linkedinProfiles.some(lp => 
        this.profilesMatch(lp, twitterProfile)
      );
      
      if (!hasMatch) {
        combinedProfiles.push(twitterProfile);
      }
    }
    
    return combinedProfiles;
  }

  private profilesMatch(profile1: ProfileResult, profile2: ProfileResult): boolean {
    // Normalize names for comparison
    const name1 = this.normalizeName(profile1.name);
    const name2 = this.normalizeName(profile2.name);
    
    // Check for exact name match
    if (name1 === name2) {
      return true;
    }
    
    // Check for partial name matches
    const [firstName1, lastName1] = this.splitName(name1);
    const [firstName2, lastName2] = this.splitName(name2);
    
    // If last names match and first names are similar
    if (lastName1 === lastName2 && this.namesSimilar(firstName1, firstName2)) {
      return true;
    }
    
    // Check company/title overlap if available
    if (profile1.company && profile2.company && 
        this.normalizeName(profile1.company) === this.normalizeName(profile2.company)) {
      return true;
    }
    
    return false;
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '') // Remove special characters
      .trim();
  }

  private splitName(name: string): [string, string] {
    const parts = name.split(' ');
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return [firstName, lastName];
  }

  private namesSimilar(name1: string, name2: string): boolean {
    // Use Levenshtein distance or similar algorithm
    const maxDistance = Math.floor(Math.max(name1.length, name2.length) * 0.3);
    return this.levenshteinDistance(name1, name2) <= maxDistance;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const track = Array(str2.length + 1).fill(null).map(() =>
      Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      track[0][i] = i;
    }
    for (let j = 0; j <= str2.length; j += 1) {
      track[j][0] = j;
    }

    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        track[j][i] = Math.min(
          track[j][i - 1] + 1, // deletion
          track[j - 1][i] + 1, // insertion
          track[j - 1][i - 1] + indicator, // substitution
        );
      }
    }

    return track[str2.length][str1.length];
  }

  private mergeProfiles(linkedinProfile: ProfileResult, twitterProfile: ProfileResult): ProfileResult {
    return {
      ...linkedinProfile,
      twitterId: twitterProfile.twitterId,
      twitterHandle: twitterProfile.twitterHandle,
      // Combine followers and engagement metrics
      followers: Math.max(linkedinProfile.followers || 0, twitterProfile.followers || 0),
      engagementRate: Math.max(linkedinProfile.engagementRate || 0, twitterProfile.engagementRate || 0),
      recentPosts: linkedinProfile.recentPosts + twitterProfile.recentPosts,
      verified: linkedinProfile.verified || twitterProfile.verified || false,
      // Combine expertise arrays
      expertise: [...new Set([
        ...(linkedinProfile.expertise || []),
        ...(twitterProfile.expertise || [])
      ])]
    };
  }

  private async verifyProfile(profile: ProfileResult): Promise<GuestSuggestion | null> {
    try {
      // Calculate scores
      const relevanceScore = this.calculateRelevanceScore(profile);
      const reachScore = this.calculateReachScore(profile);
      const engagementScore = this.calculateEngagementScore(profile);
      
      // Skip if any score is too low
      if (relevanceScore < 50 || reachScore < 40 || engagementScore < 40) {
        return null;
      }

      // Convert to GuestSuggestion format
      const suggestion: GuestSuggestion = {
        name: profile.name,
        title: profile.title,
        company: profile.company,
        expertise: profile.expertise,
        bio: profile.bio,
        linkedinUrl: profile.linkedinUrl,
        twitterHandle: profile.twitterHandle,
        relevanceScore,
        reachScore,
        engagementScore,
        followers: profile.followers,
        verified: profile.verified,
        pastPodcasts: [], // To be filled by podcast search service
        topicMatch: profile.expertise,
        verificationNotes: this.generateVerificationNotes(profile)
      };

      return suggestion;
    } catch (error) {
      console.error('Profile verification error:', error);
      return null;
    }
  }

  private calculateRelevanceScore(profile: ProfileResult): number {
    let score = 0;
    
    // Score based on profile completeness
    if (profile.name) score += 10;
    if (profile.title) score += 10;
    if (profile.company) score += 10;
    if (profile.bio && profile.bio.length > 100) score += 15;
    if (profile.expertise && profile.expertise.length > 0) score += 15;
    
    // Score based on professional presence
    if (profile.linkedinUrl) score += 20;
    if (profile.twitterHandle) score += 10;
    if (profile.verified) score += 10;
    
    return Math.min(score, 100);
  }

  private calculateReachScore(profile: ProfileResult): number {
    const followerScore = Math.min(profile.followers / 10000 * 50, 50);
    const platformScore = (profile.linkedinUrl ? 25 : 0) + (profile.twitterHandle ? 25 : 0);
    
    return Math.min(followerScore + platformScore, 100);
  }

  private calculateEngagementScore(profile: ProfileResult): number {
    let score = 0;
    
    // Score based on recent activity
    score += Math.min(profile.recentPosts / 20 * 40, 40);
    
    // Score based on engagement rate
    score += Math.min(profile.engagementRate * 100, 60);
    
    return Math.min(score, 100);
  }

  private generateVerificationNotes(profile: ProfileResult): string {
    const notes: string[] = [];
    
    if (profile.linkedinUrl && profile.twitterHandle) {
      notes.push('✓ Verified on both LinkedIn and Twitter');
    } else if (profile.linkedinUrl) {
      notes.push('✓ Verified on LinkedIn');
    } else if (profile.twitterHandle) {
      notes.push('✓ Verified on Twitter');
    }
    
    if (profile.verified) {
      notes.push('✓ Has verified account status');
    }
    
    if (profile.followers > 1000) {
      notes.push(`✓ Has ${Math.floor(profile.followers / 1000)}k followers`);
    }
    
    if (profile.recentPosts > 10) {
      notes.push('✓ Actively posting content');
    }
    
    if (profile.engagementRate > 1) {
      notes.push('✓ High engagement rate');
    }
    
    return notes.join('\n');
  }
}
