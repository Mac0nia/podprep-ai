import React from 'react';
import { motion } from 'framer-motion'
import {
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'

interface GuestSuggestion {
  name: string;
  title: string;
  company: string;
  expertise: string[];
  relevanceScore: number;
  reachScore: number;
  engagementScore: number;
  bio: string;
  linkedinUrl?: string;
  twitterHandle?: string;
  pastPodcasts: string[];
  topicMatch: string[];
}

interface Props {
  guest: GuestSuggestion;
  onSave: (guest: GuestSuggestion) => void;
}

const GuestSuggestionCard: React.FC<Props> = ({ guest, onSave }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow rounded-lg p-6 space-y-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 rounded-full p-3">
            <UserIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{guest.name}</h3>
            <p className="text-sm text-gray-600">{guest.title} at {guest.company}</p>
          </div>
        </div>
        <button
          onClick={() => onSave(guest)}
          className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-500"
        >
          <HeartIcon className="h-5 w-5" />
          <span>Save</span>
        </button>
      </div>

      <p className="text-gray-800">{guest.bio}</p>

      <div className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(guest.relevanceScore)}`}>
            {guest.relevanceScore}%
          </div>
          <div className="text-sm text-gray-500">Relevance</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(guest.reachScore)}`}>
            {guest.reachScore}%
          </div>
          <div className="text-sm text-gray-500">Reach</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold ${getScoreColor(guest.engagementScore)}`}>
            {guest.engagementScore}%
          </div>
          <div className="text-sm text-gray-500">Engagement</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-start space-x-2">
          <AcademicCapIcon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">Expertise</h4>
            <ul className="list-disc list-inside">
              {guest.expertise.map((exp, index) => (
                <li key={index}>{exp}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">Past Podcasts</h4>
            <ul className="list-disc list-inside">
              {guest.pastPodcasts.map((podcast, index) => (
                <li key={index}>{podcast}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <BriefcaseIcon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">Topic Match</h4>
            <ul className="list-disc list-inside">
              {guest.topicMatch.map((topic, index) => (
                <li key={index}>{topic}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="pt-4 flex items-center space-x-4">
        {guest.linkedinUrl && (
          <a
            href={guest.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            LinkedIn
          </a>
        )}
        {guest.twitterHandle && (
          <a
            href={`https://twitter.com/${guest.twitterHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Twitter
          </a>
        )}
      </div>
    </motion.div>
  )
}

export default GuestSuggestionCard;
