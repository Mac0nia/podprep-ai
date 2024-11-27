import React, { useState } from 'react';

interface QueryBuilderProps {
  onSearch: (query: string) => void;
}

const QueryBuilder: React.FC<QueryBuilderProps> = ({ onSearch }) => {
  const [baseQuery, setBaseQuery] = useState('');
  const [expertise, setExpertise] = useState('');
  const [location, setLocation] = useState('');
  const [language, setLanguage] = useState('');
  const [topics, setTopics] = useState('');
  const [followers, setFollowers] = useState('');
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [availability, setAvailability] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const handleSearch = () => {
    const queryParts: string[] = [baseQuery];
    if (expertise) queryParts.push(`${expertise} level`);
    if (location) queryParts.push(`in ${location}`);
    if (language) queryParts.push(`speaks ${language}`);
    if (topics) queryParts.push(`about ${topics}`);
    if (followers) queryParts.push(`${followers}+ followers`);
    if (platforms.length) queryParts.push(`on ${platforms.join(' and ')}`);
    if (availability) queryParts.push('available for booking');
    if (verifiedOnly) queryParts.push('verified only');
    onSearch(queryParts.join(' ').trim());
  };

  return (
    <div className="query-builder">
      <h3>Build Your Search Query</h3>
      <input
        type="text"
        placeholder="Base Query"
        value={baseQuery}
        onChange={(e) => setBaseQuery(e.target.value)}
      />
      <select value={expertise} onChange={(e) => setExpertise(e.target.value)}>
        <option value="">Select Expertise Level</option>
        <option value="beginner">Beginner</option>
        <option value="intermediate">Intermediate</option>
        <option value="expert">Expert</option>
      </select>
      <input
        type="text"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />
      <input
        type="text"
        placeholder="Languages (comma-separated)"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
      />
      <input
        type="text"
        placeholder="Topics (comma-separated)"
        value={topics}
        onChange={(e) => setTopics(e.target.value)}
      />
      <input
        type="text"
        placeholder="Minimum Followers"
        value={followers}
        onChange={(e) => setFollowers(e.target.value)}
      />
      <div>
        <label>
          <input
            type="checkbox"
            checked={platforms.includes('Twitter')}
            onChange={(e) => {
              if (e.target.checked) {
                setPlatforms([...platforms, 'Twitter']);
              } else {
                setPlatforms(platforms.filter(p => p !== 'Twitter'));
              }
            }}
          />
          Twitter
        </label>
        <label>
          <input
            type="checkbox"
            checked={platforms.includes('LinkedIn')}
            onChange={(e) => {
              if (e.target.checked) {
                setPlatforms([...platforms, 'LinkedIn']);
              } else {
                setPlatforms(platforms.filter(p => p !== 'LinkedIn'));
              }
            }}
          />
          LinkedIn
        </label>
        <label>
          <input
            type="checkbox"
            checked={platforms.includes('Instagram')}
            onChange={(e) => {
              if (e.target.checked) {
                setPlatforms([...platforms, 'Instagram']);
              } else {
                setPlatforms(platforms.filter(p => p !== 'Instagram'));
              }
            }}
          />
          Instagram
        </label>
        <label>
          <input
            type="checkbox"
            checked={platforms.includes('YouTube')}
            onChange={(e) => {
              if (e.target.checked) {
                setPlatforms([...platforms, 'YouTube']);
              } else {
                setPlatforms(platforms.filter(p => p !== 'YouTube'));
              }
            }}
          />
          YouTube
        </label>
      </div>
      <label>
        <input
          type="checkbox"
          checked={availability}
          onChange={(e) => setAvailability(e.target.checked)}
        />
        Available for Booking
      </label>
      <label>
        <input
          type="checkbox"
          checked={verifiedOnly}
          onChange={(e) => setVerifiedOnly(e.target.checked)}
        />
        Verified Only
      </label>
      <button onClick={handleSearch}>Search</button>
    </div>
  );
};

export default QueryBuilder;
