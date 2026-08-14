import { useState } from 'react';
import { useCurated } from '@foto-owl/media-react';
import type { Photo } from '@foto-owl/media-react';
import { MediaGrid } from '../components/MediaGrid.js';
import { MediaLightbox } from '../components/MediaLightbox.js';

/**
 * CuratedPage — Trending/curated photos.
 *
 * Data: useCurated() from media-react
 * Display: MediaGrid (wrapping useGrid) + MediaLightbox (wrapping useLightbox)
 */
export function CuratedPage(): React.JSX.Element {
  const { photos, loading, error, loadMore, hasMore } = useCurated({ perPage: 20 });

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const openLightbox = (_photo: Photo, index: number) => {
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <section className="page-curated" aria-labelledby="curated-heading">
      <h2 id="curated-heading" className="section-title">Trending Photos</h2>

      <MediaGrid
        photos={photos}
        onPhotoClick={openLightbox}
        onLoadMore={loadMore}
        hasMore={hasMore}
        loading={loading}
        error={error}
      />

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
