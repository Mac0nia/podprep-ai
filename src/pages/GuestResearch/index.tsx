import { useState } from 'react';
import GuestResearchForm from '../../components/GuestResearch/GuestResearchForm';
import GuestSuggestionCard, { GuestSuggestion } from '../../components/GuestResearch/GuestSuggestionCard';
import { motion } from 'framer-motion';
import { searchGuests } from '../../services/guests';
import { GuestSearchParams } from '../../types/guest';

export default function GuestResearch() {
  const [suggestions, setSuggestions] = useState<GuestSuggestion[]>([]);
  const [savedGuests, setSavedGuests] = useState<GuestSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (formData: GuestSearchParams) => {
    setIsSearching(true);
    setError(null);
    try {
      const results = await searchGuests(formData);
      setSuggestions(results);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to search for guests');
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSaveGuest = (guest: GuestSuggestion) => {
    setSavedGuests((prev) => {
      const isAlreadySaved = prev.some((g) => g.name === guest.name);
      if (isAlreadySaved) {
        return prev.filter((g) => g.name !== guest.name);
      }
      return [...prev, guest];
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
            Guest Research
          </h2>
          <p className="mt-2 text-lg text-gray-600">Find and analyze potential podcast guests</p>
        </div>

        <div className="space-y-8">
          <div>
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Search Criteria</h3>
              <GuestResearchForm onSubmit={handleSearch} />
            </div>

            {savedGuests.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Saved Guests</h3>
                <div className="space-y-4">
                  {savedGuests.map((guest, index) => (
                    <motion.div
                      key={`${guest.name}-${index}`} // Ensure uniqueness using name + index
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-white shadow rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="font-medium text-gray-900">{guest.name}</h4>
                        <p className="text-sm text-gray-600">{guest.title} at {guest.company}</p>
                      </div>
                      <div className="flex items-center space-x-2">
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
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            {isSearching ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
              </div>
            ) : error ? (
              <div className="text-lg text-red-600">{error}</div>
            ) : suggestions.length > 0 ? (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Suggested Guests</h3>
                {suggestions.map((guest, index) => (
                  <GuestSuggestionCard
                    key={`${guest.name}-${index}`} // Ensure uniqueness using name + index
                    guest={guest}
                    onSave={handleSaveGuest}
                    isSaved={savedGuests.some((g) => g.name === guest.name)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
