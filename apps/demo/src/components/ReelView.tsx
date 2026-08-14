import { useEffect } from 'react';
import { useMediaEvents } from '@foto-owl/media-react';
import type { Video } from '@foto-owl/media-react';
import { useReelSwiper, type ReelItem } from '@foto-owl/media-ui-react';

type VideoWithReel = Video & ReelItem;

interface ReelViewProps {
  videos: Video[];
  loading: boolean;
  error?: Error | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

/**
 * ReelView — wires useSearch (video results) + useReelSwiper (headless behavior).
 *
 * Demonstrates the consumer providing:
 * - The scroll-snap CSS (not from useReelSwiper — it only provides onScroll + ref)
 * - The slide layout and video element
 * - Event emission for 'view' when a new slide becomes active
 *
 * The CSS for .reel-container and .reel-slide (scroll-snap-type, height etc.)
 * is in app.css, not in the hook.
 */
export function ReelView({
  videos,
  loading,
  error,
  onLoadMore,
  hasMore = false,
}: ReelViewProps): React.JSX.Element {
  const { emitView } = useMediaEvents();

  const { getContainerProps, getSlideProps, activeIndex, scrollTo } = useReelSwiper<VideoWithReel>({
    items: videos as VideoWithReel[],
    onActiveChange: (video, index) => {
      // Emit view event whenever a new reel becomes active
      emitView({ mediaType: 'video', id: video.id });
      // Infinite scroll: fetch next page when user is near the end
      if (index >= videos.length - 2 && hasMore && !loading) {
        onLoadMore?.();
      }
    },
  });

  // Emit for the initially visible slide
  useEffect(() => {
    const first = videos[0];
    if (first) emitView({ mediaType: 'video', id: first.id });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return <div className="status-error" role="alert">Error: {error.message}</div>;
  }

  if (!loading && videos.length === 0) {
    return <div className="status-empty"><p>No videos found.</p></div>;
  }

  return (
    <>
      {/* The reel container — consumer provides CSS (scroll-snap-type: y mandatory) */}
      <div {...getContainerProps()} className="reel-container" id="reel-container">
        {videos.map((video, index) => {
          const slideProps = getSlideProps(video as VideoWithReel, index);
          const isActive = index === activeIndex;

          // Pick the best video file for playback
          const hdFile = video.videoFiles.find((f) => f.quality === 'hd') ?? video.videoFiles[0];

          return (
            <div
              key={video.id}
              {...slideProps}
              className={`reel-slide${isActive ? ' active-slide' : ''}`}
              id={`reel-slide-${video.id}`}
            >
              {/* Ambient blurred backdrop */}
              <div
                className="reel-slide-ambient-bg"
                style={{ backgroundImage: `url(${video.image})` }}
              />

              <div className="reel-video-wrapper">
                {isActive && hdFile ? (
                  <video
                    src={hdFile.link}
                    autoPlay
                    loop
                    muted
                    playsInline
                    poster={video.image}
                    aria-label={`Video by ${video.user.name}`}
                  />
                ) : (
                  // Lazy: show poster while not active
                  <img
                    src={video.image}
                    alt={`Video by ${video.user.name}`}
                  />
                )}
              </div>

              <div className="reel-meta">
                <h3>{video.user.name}</h3>
                <p>{video.duration}s · {video.width}×{video.height}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress indicator — custom-built, shows a subtle vertical progress rail */}
      {videos.length > 0 && (
        <div className="reel-progress-wrapper" aria-label="Reel progress">
          <div className="reel-progress-rail">
            <div
              className="reel-progress-bar"
              style={{
                height: `${Math.max(10, (1 / videos.length) * 100)}%`,
                top: `${(activeIndex / Math.max(1, videos.length - 1)) * (100 - Math.max(10, (1 / videos.length) * 100))}%`,
              }}
            />
          </div>
        </div>
      )}

      {loading && (
        <div className="load-more-area" role="status" aria-label="Loading videos">
          <div className="load-spinner" />
        </div>
      )}
    </>
  );
}
