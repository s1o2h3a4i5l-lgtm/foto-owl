import { useEffect, useState, useCallback } from 'react';
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

export function ReelView({
  videos,
  loading,
  error,
  onLoadMore,
  hasMore = false,
}: ReelViewProps): React.JSX.Element {
  const { emitView, emitDownload } = useMediaEvents();
  const [isMuted, setIsMuted] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'play' | 'pause'; id: number } | null>(null);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        scrollTo(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        scrollTo(activeIndex - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeIndex, scrollTo]);

  // Video download
  const handleDownload = useCallback((video: Video, e: React.MouseEvent) => {
    e.stopPropagation();
    const hdFile = video.videoFiles.find((f) => f.quality === 'hd') ?? video.videoFiles[0];
    if (!hdFile) return;

    emitDownload({ mediaType: 'video', id: video.id, url: hdFile.link });

    fetch(hdFile.link)
      .then((response) => response.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `video-${video.id}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(() => {
        const a = document.createElement('a');
        a.href = hdFile.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      });
  }, [emitDownload]);

  // Video click handler for play/pause toggling
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.reel-action-btn') || target.closest('button')) {
      return;
    }

    const videoEl = e.currentTarget.querySelector('video');
    if (videoEl) {
      if (videoEl.paused) {
        videoEl.play().catch(() => {});
        setFeedback({ type: 'play', id: Date.now() });
      } else {
        videoEl.pause();
        setFeedback({ type: 'pause', id: Date.now() });
      }
    }
  }, []);

  if (error) {
    return <div className="status-error" role="alert">Error: {error.message}</div>;
  }

  if (!loading && videos.length === 0) {
    return <div className="status-empty"><p>No videos found.</p></div>;
  }

  // Calculate active dot index (exactly 3 dots representation)
  let activeDot = 0;
  if (videos.length > 0) {
    const segment = videos.length / 3;
    if (activeIndex < segment) {
      activeDot = 0;
    } else if (activeIndex < segment * 2) {
      activeDot = 1;
    } else {
      activeDot = 2;
    }
  }

  return (
    <>
      <div {...getContainerProps()} className="reel-container" id="reel-container">
        {videos.map((video, index) => {
          const slideProps = getSlideProps(video as VideoWithReel, index);
          const isActive = index === activeIndex;
          const shouldPreload = index === activeIndex + 1 || index === activeIndex - 1;

          // Pick the best video file for playback
          const hdFile = video.videoFiles.find((f) => f.quality === 'hd') ?? video.videoFiles[0];

          return (
            <div
              key={video.id}
              {...slideProps}
              className={`reel-slide${isActive ? ' active-slide' : ''}`}
              id={`reel-slide-${video.id}`}
              onClick={handleVideoClick}
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
                    muted={isMuted}
                    playsInline
                    poster={video.image}
                    aria-label={`Video by ${video.user.name}`}
                  />
                ) : shouldPreload && hdFile ? (
                  <video
                    src={hdFile.link}
                    preload="auto"
                    muted
                    playsInline
                    style={{ display: 'none' }}
                  />
                ) : (
                  <img
                    src={video.image}
                    alt={`Video by ${video.user.name}`}
                  />
                )}
              </div>

              {/* Action buttons inside the slide */}
              <div className="reel-action-buttons">
                <button
                  className="reel-action-btn mute-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted(!isMuted);
                  }}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <button
                  className="reel-action-btn download-btn"
                  onClick={(e) => handleDownload(video, e)}
                  aria-label="Download video"
                >
                  ↓
                </button>
              </div>

              {/* Feedback Overlay */}
              {isActive && feedback && (
                <div key={feedback.id} className="video-feedback-overlay">
                  <span className="feedback-icon">{feedback.type === 'play' ? '▶' : '❚❚'}</span>
                </div>
              )}

              <div className="reel-meta">
                <h3>{video.user.name}</h3>
                <p>{video.duration}s · {video.width}×{video.height}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress dots indicator */}
      {videos.length > 0 && (
        <div className="reel-dots-indicator" aria-label="Reel position indicator">
          <span className={`reel-dot ${activeDot === 0 ? 'active' : ''}`} />
          <span className={`reel-dot ${activeDot === 1 ? 'active' : ''}`} />
          <span className={`reel-dot ${activeDot === 2 ? 'active' : ''}`} />
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
