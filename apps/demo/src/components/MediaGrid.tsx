import type { Photo } from '@foto-owl/media-react';
import { useGrid, type GridItem } from '@foto-owl/media-ui-react';

type PhotoWithGrid = Photo & GridItem;

interface MediaGridProps {
  photos: Photo[];
  onPhotoClick: (photo: Photo, index: number) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
  error?: Error | null;
}

/**
 * MediaGrid — the wiring component that connects data (photo props from useSearch/useCurated)
 * to the headless useGrid hook, then provides the consumer markup/styles.
 *
 * This is where the "no shipped styles" contract is demonstrated:
 * useGrid() gives us event handlers + ARIA attributes, we apply them to our own markup.
 */
export function MediaGrid({
  photos,
  onPhotoClick,
  onLoadMore,
  hasMore,
  loading,
  error,
}: MediaGridProps): React.JSX.Element {
  // Cast photos to satisfy GridItem constraint (they already have an `id` field)
  const items = photos as PhotoWithGrid[];

  const { getContainerProps, getItemProps, getSentinelProps, isLoading } = useGrid({
    items,
    onItemClick: (photo, index) => onPhotoClick(photo as Photo, index),
    onLoadMore,
    hasMore,
    loading,
  });

  if (error) {
    return <div className="status-error" role="alert">Error: {error.message}</div>;
  }

  if (!loading && photos.length === 0) {
    return (
      <div className="status-empty">
        <p>No photos found.</p>
      </div>
    );
  }

  return (
    <>
      {/* Consumer-owned markup — useGrid provides only ARIA + handlers */}
      <ul {...getContainerProps()} className="media-grid">
        {photos.map((photo, index) => (
          <li
            key={photo.id}
            {...getItemProps(photo as PhotoWithGrid, index)}
            className="media-grid-item"
            style={{ aspectRatio: `${photo.width} / ${photo.height}` }}
          >
            <img
              src={photo.src.medium}
              alt={photo.alt || `Photo by ${photo.photographer}`}
              loading="lazy"
              width={photo.width}
              height={photo.height}
              style={{ aspectRatio: `${photo.width} / ${photo.height}`, width: '100%', height: 'auto' }}
            />
            <div className="item-overlay" aria-hidden="true">
              <span className="item-photographer">{photo.photographer}</span>
              <span className="item-dimensions">{photo.width} × {photo.height}</span>
            </div>
          </li>
        ))}
      </ul>

      {/* Sentinel — IntersectionObserver watches this for infinite scroll */}
      <div {...getSentinelProps()} className="grid-sentinel" aria-hidden="true" />

      {isLoading && (
        <div className="load-more-area" aria-label="Loading more photos" role="status">
          <div className="load-spinner" />
        </div>
      )}
    </>
  );
}
