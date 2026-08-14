import { useState } from 'react';
import { SearchPage } from './pages/SearchPage.js';
import { CuratedPage } from './pages/CuratedPage.js';

type Page = 'curated' | 'search';

export function App(): React.JSX.Element {
  const [page, setPage] = useState<Page>('curated');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSearchQuery(searchInput.trim());
      setPage('search');
    }
  };

  const handleTrendingClick = () => {
    setPage('curated');
    setSearchInput('');
    setSearchQuery('');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>MediaSDK</h1>

        <form className="header-search-bar" onSubmit={handleSearchSubmit} role="search">
          <input
            id="header-search-input"
            className="header-search-input"
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search photos and videos…"
            aria-label="Search Pexels media"
          />
        </form>
      </header>

      <main className="app-main" id="main-content">
        {page === 'curated' && <CuratedPage />}
        {page === 'search' && <SearchPage query={searchQuery} onBack={handleTrendingClick} />}
      </main>
    </div>
  );
}
