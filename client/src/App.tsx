import React from 'react';
import QueryBuilder from './components/QueryBuilder';

const App: React.FC = () => {
  const handleSearch = (query: string) => {
    console.log('Search query:', query);
    // Here, you would typically make an API call to your backend search endpoint
    // For example:
    // fetch(`/api/search?query=${encodeURIComponent(query)}`)
    //   .then(response => response.json())
    //   .then(data => console.log(data));
  };

  return (
    <div className="App">
      <h1>Podcast Guest Search</h1>
      <QueryBuilder onSearch={handleSearch} />
    </div>
  );
};

export default App;
