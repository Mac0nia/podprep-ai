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
  isSaved: boolean;
}

const GuestSuggestionCard: React.FC<Props> = ({ guest, onSave, isSaved }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white shadow-md rounded-lg p-6 mb-4"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="bg-gray-100 rounded-full p-3">
            <UserIcon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">{guest.name}</h3>
            <p className="text-sm text-gray-600">{guest.title} at {guest.company}</p>
          </div>
        </div>
        <button
          onClick={() => onSave(guest)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <HeartIcon className={`h-5 w-5 mr-2 ${isSaved ? 'fill-current' : ''}`} />
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>

      <p className="text-gray-800 mt-2">{guest.bio}</p>

      <div className="mt-4">
        <h4 className="font-medium text-gray-900">Expertise</h4>
        <ul className="list-disc list-inside">
          {guest.expertise.map((exp, index) => (
            <li key={index}>{exp}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h4 className="font-medium text-gray-900">Scores</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Relevance</p>
            <p className={`text-2xl font-bold ${getScoreColor(guest.relevanceScore)}`}>{guest.relevanceScore}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Reach</p>
            <p className={`text-2xl font-bold ${getScoreColor(guest.reachScore)}`}>{guest.reachScore}%</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-600">Engagement</p>
            <p className={`text-2xl font-bold ${getScoreColor(guest.engagementScore)}`}>{guest.engagementScore}%</p>
          </div>
        </div>
      </div>
      <div className="mt-4">
        <h4 className="font-medium text-gray-900">Past Podcasts</h4>
        <ul className="list-disc list-inside">
          {guest.pastPodcasts.map((podcast, index) => (
            <li key={index}>{podcast}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4">
        <h4 className="font-medium text-gray-900">Topic Match</h4>
        <ul className="list-disc list-inside">
          {guest.topicMatch.map((topic, index) => (
            <li key={index}>{topic}</li>
          ))}
        </ul>
      </div>
      <div className="mt-4 flex space-x-4">
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
