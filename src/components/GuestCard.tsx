import React from 'react';
import { GuestSuggestion, PodcastAppearance } from '../types/guest';

interface GuestCardProps {
  guest: GuestSuggestion;
}

const PodcastIcon: React.FC<{ platform: PodcastAppearance['platform'] }> = ({ platform }) => {
  switch (platform) {
    case 'YouTube':
      return <span className="text-red-600">▶</span>;
    case 'Spotify':
      return <span className="text-green-500">●</span>;
    case 'Apple Podcasts':
      return <span className="text-purple-500">♫</span>;
    default:
      return <span className="text-gray-500">◆</span>;
  }
};

const GuestCard: React.FC<GuestCardProps> = ({ guest }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-4 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold text-gray-800">{guest.name}</h3>
          <p className="text-gray-600">{guest.title} at {guest.company}</p>
        </div>
        <div className="flex space-x-2">
          {guest.linkedinUrl && (
            <a
              href={guest.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              <i className="fab fa-linkedin"></i>
            </a>
          )}
          {guest.twitterHandle && (
            <a
              href={`https://twitter.com/${guest.twitterHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-600"
            >
              <i className="fab fa-twitter"></i>
            </a>
          )}
        </div>
      </div>

      <div className="mt-4">
        <p className="text-gray-700">{guest.bio}</p>
      </div>

      <div className="mt-4">
        <h4 className="font-semibold text-gray-700 mb-2">Expertise</h4>
        <div className="flex flex-wrap gap-2">
          {guest.expertise.map((skill, index) => (
            <span
              key={index}
              className="bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full"
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {guest.pastPodcasts && guest.pastPodcasts.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold text-gray-700 mb-2">Recent Appearances</h4>
          <div className="space-y-2">
            {guest.pastPodcasts.map((podcast, index) => (
              <a
                key={index}
                href={podcast.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-50 p-3 rounded hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <PodcastIcon platform={podcast.platform} />
                  <div className="flex-grow">
                    <div className="font-medium text-gray-800">{podcast.podcastName}</div>
                    {podcast.episodeTitle && (
                      <div className="text-sm text-gray-600">{podcast.episodeTitle}</div>
                    )}
                  </div>
                  {podcast.date && (
                    <div className="text-sm text-gray-500">{podcast.date}</div>
                  )}
                </div>
                {podcast.description && (
                  <p className="text-sm text-gray-600 mt-1">{podcast.description}</p>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-500">
          <div>
            Relevance: {guest.relevanceScore}%
          </div>
          <div>
            Engagement: {guest.engagementScore}%
          </div>
          <div>
            Reach: {guest.reachScore}%
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestCard;
