import { useState } from 'react';
import { useSearch } from '@foto-owl/media-react';
import type { Photo } from '@foto-owl/media-react';
import { MediaGrid } from '../components/MediaGrid.js';
import { MediaLightbox } from '../components/MediaLightbox.js';
import { ReelView } from '../components/ReelView.js';

/**
 * SearchPage — search bar + tabbed photo/video results.
 *
 * Data: useSearch() from media-react (fetches both photos + videos in one call)
 * Display: MediaGrid / ReelView + MediaLightbox
 */
export interface SearchPageProps {
  query: string;
  onBack: () => void;
}

export function SearchPage({ query, onBack }: SearchPageProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  const { photos, videos, loading, error, loadMore, hasMore } = useSearch(query, {
    enabled: query.trim().length > 0,
    perPage: 20,
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openPhotoLightbox = (_photo: Photo, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section
      aria-labelledby="search-heading"
      className={activeTab === 'videos' && query ? 'page-videos-active' : ''}
    >
      <h2 id="search-heading" className="section-title sr-only" style={{ display: 'none' }}>Search Results</h2>

      {query && (
        <>
          <div className="tab-bar-container">
            <button
              onClick={onBack}
              className="back-btn tab-back-btn"
              aria-label="Back to Trending"
            >
              ←
            </button>
            <div className="tab-bar" role="tablist" aria-label="Result type">
              <button
                id="tab-photos"
                role="tab"
                aria-selected={activeTab === 'photos'}
                className={`tab-btn${activeTab === 'photos' ? ' active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                Photos
              </button>
              <button
                id="tab-videos"
                role="tab"
                aria-selected={activeTab === 'videos'}
                className={`tab-btn${activeTab === 'videos' ? ' active' : ''}`}
                onClick={() => setActiveTab('videos')}
              >
                Videos
              </button>
            </div>
          </div>

          {activeTab === 'photos' && (
            <MediaGrid
              photos={photos}
              onPhotoClick={openPhotoLightbox}
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loading}
              error={error}
            />
          )}

          {activeTab === 'videos' && (
            <>
              {error && <div className="status-error" role="alert">{error.message}</div>}
              {!loading && videos.length === 0 && (
                <div className="status-empty"><p>No videos found for "{query}".</p></div>
              )}
              {videos.length > 0 && (
                <div className="search-reels-wrapper">
                  <ReelView
                    videos={videos}
                    loading={loading}
                    error={error}
                    onLoadMore={loadMore}
                    hasMore={hasMore}
                  />
                </div>
              )}
            </>
          )}
        </>
      )}

      {!query && (
        <div className="status-empty">
          <p>Enter a search term to find photos and videos.</p>
        </div>
      )}

      <MediaLightbox
        items={photos}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        mediaType="photo"
      />
    </section>
  );
}
