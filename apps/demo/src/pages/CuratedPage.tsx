import { useState } from 'react';
import { useCurated, useTrendingVideos } from '@foto-owl/media-react';
import type { Photo } from '@foto-owl/media-react';
import { MediaGrid } from '../components/MediaGrid.js';
import { MediaLightbox } from '../components/MediaLightbox.js';
import { ReelView } from '../components/ReelView.js';

/**
 * CuratedPage — Trending/curated photos and popular/trending videos.
 *
 * Data: useCurated() and useTrendingVideos() from media-react
 * Display: MediaGrid (for photos) or ReelView (for videos)
 */
export function CuratedPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');

  const { photos, loading: photosLoading, error: photosError, loadMore: loadMorePhotos, hasMore: hasMorePhotos } = useCurated({
    perPage: 20,
    enabled: activeTab === 'photos',
  });

  const { videos, loading: videosLoading, error: videosError, loadMore: loadMoreVideos, hasMore: hasMoreVideos } = useTrendingVideos({
    perPage: 20,
    enabled: activeTab === 'videos',
  });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (_photo: Photo, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section
      className={`page-curated ${activeTab === 'videos' ? 'page-videos-active' : ''}`}
      aria-labelledby="curated-heading"
    >
      <h2 id="curated-heading" className="section-title sr-only" style={{ display: 'none' }}>Trending</h2>

      <div className="tab-bar-container">
        <div className="tab-bar" role="tablist" aria-label="Media type">
          <button
            id="curated-tab-photos"
            role="tab"
            aria-selected={activeTab === 'photos'}
            className={`tab-btn${activeTab === 'photos' ? ' active' : ''}`}
            onClick={() => setActiveTab('photos')}
          >
            Photos
          </button>
          <button
            id="curated-tab-videos"
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
          onPhotoClick={openLightbox}
          onLoadMore={loadMorePhotos}
          hasMore={hasMorePhotos}
          loading={photosLoading}
          error={photosError}
        />
      )}

      {activeTab === 'videos' && (
        <>
          {videosError && <div className="status-error" role="alert">{videosError.message}</div>}
          {!videosLoading && videos.length === 0 && (
            <div className="status-empty"><p>No trending videos found.</p></div>
          )}
          {videos.length > 0 && (
            <div className="search-reels-wrapper">
              <ReelView
                videos={videos}
                loading={videosLoading}
                error={videosError}
                onLoadMore={loadMoreVideos}
                hasMore={hasMoreVideos}
              />
            </div>
          )}
        </>
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
