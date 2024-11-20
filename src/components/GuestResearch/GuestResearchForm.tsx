import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { fetchGuestSuggestions } from '../../services/api';

interface GuestResearchFormData {
  linkedinUrl?: string;
  twitterHandle?: string;
  keywords: string;
  podcastTopic: string;
  audienceSize: string;
  guestExpertise: string;
}

interface GuestResearchFormProps {
  onSubmit: (data: GuestResearchFormData) => void;
}

export default function GuestResearchForm({ onSubmit }: GuestResearchFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const { register, handleSubmit, formState: { errors } } = useForm<GuestResearchFormData>()

  const onSubmitForm = async (data: GuestResearchFormData) => {
    try {
      setIsLoading(true);
      const response = await fetchGuestSuggestions(data);
      setSuggestions(response.suggestions);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6 max-w-2xl">
      <div className="space-y-4">
        <div>
          <label htmlFor="podcastTopic" className="block text-sm font-medium leading-6 text-gray-900">
            Podcast Topic/Theme
          </label>
          <div className="mt-2">
            <input
              {...register('podcastTopic', { required: 'Podcast topic is required' })}
              type="text"
              id="podcastTopic"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="e.g., Tech Entrepreneurship, AI Innovation"
            />
            {errors.podcastTopic && (
              <p className="mt-2 text-sm text-red-600">{errors.podcastTopic.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="guestExpertise" className="block text-sm font-medium leading-6 text-gray-900">
            Desired Guest Expertise
          </label>
          <div className="mt-2">
            <input
              {...register('guestExpertise', { required: 'Guest expertise is required' })}
              type="text"
              id="guestExpertise"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="e.g., Machine Learning, Startup Founder"
            />
            {errors.guestExpertise && (
              <p className="mt-2 text-sm text-red-600">{errors.guestExpertise.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="keywords" className="block text-sm font-medium leading-6 text-gray-900">
            Keywords (separate with commas)
          </label>
          <div className="mt-2">
            <input
              {...register('keywords', { required: 'Keywords are required' })}
              type="text"
              id="keywords"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="e.g., artificial intelligence, startup, innovation"
            />
            {errors.keywords && (
              <p className="mt-2 text-sm text-red-600">{errors.keywords.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="audienceSize" className="block text-sm font-medium leading-6 text-gray-900">
            Target Audience Size
          </label>
          <div className="mt-2">
            <select
              {...register('audienceSize')}
              id="audienceSize"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            >
              <option value="">Any size</option>
              <option value="small">Small (1k-10k followers)</option>
              <option value="medium">Medium (10k-100k followers)</option>
              <option value="large">Large (100k+ followers)</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="linkedinUrl" className="block text-sm font-medium leading-6 text-gray-900">
            LinkedIn Profile URL (optional)
          </label>
          <div className="mt-2">
            <input
              {...register('linkedinUrl', {
                pattern: {
                  value: /^https:\/\/[w{3}.]?linkedin.com\/.*$/,
                  message: 'Please enter a valid LinkedIn URL'
                }
              })}
              type="url"
              id="linkedinUrl"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              placeholder="https://linkedin.com/in/username"
            />
            {errors.linkedinUrl && (
              <p className="mt-2 text-sm text-red-600">{errors.linkedinUrl.message}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="twitterHandle" className="block text-sm font-medium leading-6 text-gray-900">
            Twitter Handle (optional)
          </label>
          <div className="mt-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-500 sm:text-sm">@</span>
              </div>
              <input
                {...register('twitterHandle')}
                type="text"
                id="twitterHandle"
                className="block w-full rounded-md border-0 py-1.5 pl-7 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                placeholder="username"
              />
            </div>
          </div>
        </div>
      </div>

      <div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:bg-indigo-400"
        >
          {isLoading ? (
            <div className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </div>
          ) : (
            <div className="flex items-center">
              <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
              Find Potential Guests
            </div>
          )}
        </button>
      </div>
      {isLoading && <div className="spinner">Loading...</div>}
    </form>
  )
}
