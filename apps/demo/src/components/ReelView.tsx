import { useEffect, useState, useCallback, useRef } from 'react';
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

  // Persistent refs to every <video> element — keyed by video.id
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Gesture classification state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const isSwipingRef = useRef<boolean>(false);

  const { getContainerProps, getSlideProps, activeIndex, scrollTo } = useReelSwiper<VideoWithReel>({
    items: videos as VideoWithReel[],
    onActiveChange: (video, index) => {
      emitView({ mediaType: 'video', id: video.id });
      if (index >= videos.length - 2 && hasMore && !loading) {
        onLoadMore?.();
      }
    },
  });

  // Emit view for the initial slide on mount
  useEffect(() => {
    const first = videos[0];
    if (first) emitView({ mediaType: 'video', id: first.id });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Core lifecycle: play active, pause all others ───────────────────────────
  // This effect runs whenever activeIndex changes. It explicitly calls
  // play() on the newly active video and pause() on all others.
  useEffect(() => {
    videos.forEach((video, index) => {
      const el = videoRefs.current.get(video.id);
      if (!el) return;

      if (index === activeIndex) {
        // Sync muted state so mobile autoplay is permitted
        el.muted = isMuted;
        const playPromise = el.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // Autoplay blocked — this is fine, the user can tap to play
          });
        }
      } else {
        el.pause();
        // Rewind the previous video so it starts from the beginning next time
        el.currentTime = 0;
      }
    });
  }, [activeIndex, videos]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync muted state change to the currently active video element immediately
  useEffect(() => {
    const activeVideo = videos[activeIndex];
    if (!activeVideo) return;
    const el = videoRefs.current.get(activeVideo.id);
    if (el) el.muted = isMuted;
  }, [isMuted, activeIndex, videos]);

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

  // Touch gesture classification
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      isSwipingRef.current = false;
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const start = touchStartRef.current;
    if (!start) return;

    const touch = e.changedTouches[0];
    if (touch) {
      const deltaX = Math.abs(touch.clientX - start.x);
      const deltaY = Math.abs(touch.clientY - start.y);

      // If movement > 10px in any direction, classify as a swipe
      if (deltaX > 10 || deltaY > 10) {
        isSwipingRef.current = true;
        // Hold the swiping flag briefly to block the synthetic click event
        setTimeout(() => {
          isSwipingRef.current = false;
        }, 200);
      }
    }
    touchStartRef.current = null;
  }, []);

  // Tap/click to toggle play/pause (only fires when NOT a swipe)
  const handleVideoClick = useCallback((e: React.MouseEvent<HTMLDivElement>, videoId: number) => {
    const target = e.target as HTMLElement;
    if (target.closest('.reel-action-btn') || target.closest('button')) {
      return;
    }

    if (isSwipingRef.current) {
      return;
    }

    const el = videoRefs.current.get(videoId);
    if (el) {
      if (el.paused) {
        el.play().catch(() => {});
        setFeedback({ type: 'play', id: Date.now() });
      } else {
        el.pause();
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

  // Calculate active dot (3-dot proportional mapping)
  let activeDot = 0;
  if (videos.length > 0) {
    const ratio = activeIndex / Math.max(1, videos.length - 1);
    if (ratio < 0.33) activeDot = 0;
    else if (ratio < 0.66) activeDot = 1;
    else activeDot = 2;
  }

  return (
    <>
      <div {...getContainerProps()} className="reel-container" id="reel-container">
        {videos.map((video, index) => {
          const slideProps = getSlideProps(video as VideoWithReel, index);
          const isActive = index === activeIndex;
          const shouldPreload = index === activeIndex + 1 || index === activeIndex - 1;

          const hdFile = video.videoFiles.find((f) => f.quality === 'hd') ?? video.videoFiles[0];

          return (
            <div
              key={video.id}
              {...slideProps}
              className={`reel-slide${isActive ? ' active-slide' : ''}`}
              id={`reel-slide-${video.id}`}
              onClick={(e) => handleVideoClick(e, video.id)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* Ambient blurred backdrop */}
              <div
                className="reel-slide-ambient-bg"
                style={{ backgroundImage: `url(${video.image})` }}
              />

              <div className="reel-video-wrapper">
                {hdFile ? (
                  /*
                   * The <video> element stays mounted for all slides, not just the active one.
                   * We control playback imperatively via videoRefs so that mobile browsers
                   * honor the play() call triggered from the scroll settle event rather than
                   * trying to autoplay a newly mounted element.
                   */
                  <video
                    ref={(el) => {
                      if (el) {
                        videoRefs.current.set(video.id, el);
                      } else {
                        videoRefs.current.delete(video.id);
                      }
                    }}
                    src={hdFile.link}
                    loop
                    muted={isMuted}
                    playsInline
                    preload={isActive || shouldPreload ? 'auto' : 'none'}
                    poster={video.image}
                    aria-label={`Video by ${video.user.name}`}
                    // visibility:hidden keeps the element mounted (required for imperative
                    // play/pause) while non-active slides don't draw on screen
                    style={isActive ? undefined : { visibility: 'hidden', pointerEvents: 'none' }}
                  />
                ) : (
                  <img
                    src={video.image}
                    alt={`Video by ${video.user.name}`}
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="reel-action-buttons">
                <button
                  className="reel-action-btn mute-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMuted((m) => !m);
                  }}
                  aria-label={isMuted ? 'Unmute video' : 'Mute video'}
                >
                  {isMuted ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                    </svg>
                  )}
                </button>
                <button
                  className="reel-action-btn download-btn"
                  onClick={(e) => handleDownload(video, e)}
                  aria-label="Download video"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </button>
              </div>

              {/* Play/Pause Feedback Overlay */}
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

      {/* 3-Dot position indicator */}
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
