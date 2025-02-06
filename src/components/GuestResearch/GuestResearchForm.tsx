import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { GuestSearchParams } from '../../types/guest';
import { URLValidator } from '../../services/validation/urlValidator';

interface GuestResearchFormProps {
  onSubmit: (data: GuestSearchParams) => void;
}

export default function GuestResearchForm({ onSubmit }: GuestResearchFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, formState: { errors }, setError } = useForm<GuestSearchParams>();

  const onSubmitForm = async (data: GuestSearchParams) => {
    setIsLoading(true);
    try {
      // Validate LinkedIn URL if provided
      if (data.linkedinUrl) {
        const validation = await URLValidator.validateAndNormalizeURL(data.linkedinUrl);
        if (!validation.isValid) {
          setError('linkedinUrl', { 
            type: 'manual',
            message: validation.error
          });
          setIsLoading(false);
          return;
        }
        data.linkedinUrl = validation.normalizedURL;
      }

      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6 bg-white">
      <h2 className="text-2xl font-bold text-gray-900">Find Podcast Guests X</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="podcastTopic" className="block text-sm font-medium text-gray-700">Podcast Topic</label>
          <input
            type="text"
            id="podcastTopic"
            {...register('podcastTopic', { required: 'Podcast topic is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
          />
          {errors.podcastTopic && <p className="mt-2 text-sm text-red-600">{errors.podcastTopic.message}</p>}
        </div>

        <div>
          <label htmlFor="guestExpertise" className="block text-sm font-medium text-gray-700">Guest Expertise</label>
          <input
            type="text"
            id="guestExpertise"
            {...register('guestExpertise', { required: 'Guest expertise is required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
          />
          {errors.guestExpertise && <p className="mt-2 text-sm text-red-600">{errors.guestExpertise.message}</p>}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="keywords" className="block text-sm font-medium text-gray-700">Keywords</label>
          <input
            type="text"
            id="keywords"
            {...register('keywords', { required: 'Keywords are required' })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
          />
          {errors.keywords && <p className="mt-2 text-sm text-red-600">{errors.keywords.message}</p>}
        </div>

        <div>
          <label htmlFor="audienceSize" className="block text-sm font-medium text-gray-700">Audience Size</label>
          <select
            id="audienceSize"
            {...register('audienceSize')}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
          >
            <option value="">Any size</option>
            <option value="small">Small (1k-10k followers)</option>
            <option value="medium">Medium (10k-100k followers)</option>
            <option value="large">Large (100k+ followers)</option>
          </select>
        </div>

        <div>
          <label htmlFor="linkedinUrl" className="block text-sm font-medium text-gray-700">LinkedIn URL</label>
          <input
            type="url"
            id="linkedinUrl"
            {...register('linkedinUrl', {
              validate: async (value) => {
                if (!value) return true;
                const validation = await URLValidator.validateAndNormalizeURL(value);
                return validation.isValid || validation.error;
              }
            })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white"
            placeholder="https://linkedin.com/in/username"
          />
          {errors.linkedinUrl && <p className="mt-2 text-sm text-red-600">{errors.linkedinUrl.message}</p>}
        </div>

        <div>
          <label htmlFor="twitterHandle" className="block text-sm font-medium text-gray-700">Twitter Handle</label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <span className="text-gray-500 sm:text-sm">@</span>
            </div>
            <input
              type="text"
              id="twitterHandle"
              {...register('twitterHandle')}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm text-gray-900 bg-white pl-7"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isLoading ? 'Searching...' : 'Search'}
          <MagnifyingGlassIcon className="ml-2 h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
}
