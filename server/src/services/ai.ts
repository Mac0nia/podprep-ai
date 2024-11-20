import { GuestSearchParams, GuestSuggestion } from '../types/guest';

export async function searchGuests(params: GuestSearchParams): Promise<GuestSuggestion[]> {
  // Mock data for testing
  return [
    {
      name: 'Jane Doe',
      title: 'AI Researcher',
      company: 'Tech Innovations',
      expertise: ['Machine Learning', 'Data Science'],
      relevanceScore: 90,
      reachScore: 80,
      engagementScore: 85,
      bio: 'Expert in AI and data science with a focus on ethical AI.',
      linkedinUrl: 'https://linkedin.com/in/janedoe',
      twitterHandle: 'janedoeai',
      pastPodcasts: ['AI Today', 'Data Science Weekly'],
      topicMatch: ['AI Development', 'Ethics in AI'],
    },
    {
      name: 'John Smith',
      title: 'Tech Entrepreneur',
      company: 'Startup Hub',
      expertise: ['Entrepreneurship', 'Innovation'],
      relevanceScore: 85,
      reachScore: 90,
      engagementScore: 80,
      bio: 'Founder of several successful tech startups focusing on innovation.',
      linkedinUrl: 'https://linkedin.com/in/johnsmith',
      twitterHandle: 'johnsmithtech',
      pastPodcasts: ['Startup Stories', 'Tech Innovators'],
      topicMatch: ['Startup Growth', 'Innovation'],
    },
  ];
}

function calculateRelevanceScore(suggestion: any, params: GuestSearchParams): number {
  // Calculate relevance score based on expertise match and topic alignment
  const expertiseMatch = suggestion.expertise.some((exp: string) => 
    params.guestExpertise.toLowerCase().includes(exp.toLowerCase())
  );
  
  const topicMatch = suggestion.topicMatch.some((topic: string) =>
    params.podcastTopic.toLowerCase().includes(topic.toLowerCase())
  );

  return (expertiseMatch ? 50 : 0) + (topicMatch ? 50 : 0);
}

function calculateReachScore(suggestion: any): number {
  // Calculate reach score based on past podcast appearances
  const podcastCount = suggestion.pastPodcasts?.length || 0;
  return Math.min(Math.round((podcastCount / 5) * 100), 100);
}

function calculateEngagementScore(suggestion: any): number {
  // Calculate engagement score based on available social media presence
  const hasLinkedIn = suggestion.linkedinUrl ? 50 : 0;
  const hasTwitter = suggestion.twitterHandle ? 50 : 0;
  return hasLinkedIn + hasTwitter;
}
