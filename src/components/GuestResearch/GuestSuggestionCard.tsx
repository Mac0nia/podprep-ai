import { motion } from 'framer-motion'
import {
  UserIcon,
  AcademicCapIcon,
  BriefcaseIcon,
  ChatBubbleLeftRightIcon,
  ChartBarIcon,
  HeartIcon,
} from '@heroicons/react/24/outline'

export interface GuestSuggestion {
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
  pastPodcasts?: string[];
  topicMatch: string[];
}

interface Props {
  guest: GuestSuggestion;
  onSave: (guest: GuestSuggestion) => void;
}

export default function GuestSuggestionCard({ guest, onSave }: Props) {
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
            <div className="mt-1 flex flex-wrap gap-2">
              {guest.expertise.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <BriefcaseIcon className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-medium text-gray-900">Topic Match</h4>
            <div className="mt-1 flex flex-wrap gap-2">
              {guest.topicMatch.map((topic) => (
                <span
                  key={topic}
                  className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        </div>

        {guest.pastPodcasts && guest.pastPodcasts.length > 0 && (
          <div className="flex items-start space-x-2">
            <ChatBubbleLeftRightIcon className="h-5 w-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-gray-900">Past Podcast Appearances</h4>
              <ul className="mt-1 text-sm text-gray-600 list-disc list-inside">
                {guest.pastPodcasts.map((podcast) => (
                  <li key={podcast}>{podcast}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 flex items-center space-x-4">
        {guest.linkedinUrl && (
          <a
            href={guest.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
            </svg>
          </a>
        )}
        {guest.twitterHandle && (
          <a
            href={`https://twitter.com/${guest.twitterHandle}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-600 hover:text-gray-900"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
            </svg>
          </a>
        )}
      </div>
    </motion.div>
  )
}
