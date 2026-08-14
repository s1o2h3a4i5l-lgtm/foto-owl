import { useEffect } from 'react';
import { useMediaEvents } from '@foto-owl/media-react';
import type { Photo, Video } from '@foto-owl/media-react';
import { useLightbox, type LightboxItem } from '@foto-owl/media-ui-react';
import { createPortal } from 'react-dom';

interface MediaLightboxProps {
  items: (Photo | Video)[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  mediaType: 'photo' | 'video';
}

function toPhotoLightboxItem(photo: Photo): LightboxItem {
  return {
    id: photo.id,
    type: 'photo',
    src: photo.src.large2x,
    alt: photo.alt || `Photo by ${photo.photographer}`,
  };
}

function toVideoLightboxItem(video: Video): LightboxItem {
  // Find the best quality video file
  const hdFile = video.videoFiles.find((f) => f.quality === 'hd') ?? video.videoFiles[0];
  return {
    id: video.id,
    type: 'video',
    src: video.image, // poster image
    alt: `Video by ${video.user.name}`,
    ...(hdFile?.link !== undefined && { videoSrc: hdFile.link }),
  };
}

/**
 * MediaLightbox — wires useLightbox (from media-ui-react) with the SDK event system
 * (useMediaEvents from media-react).
 *
 * This component is responsible for:
 * 1. Mapping SDK photo/video types to LightboxItem (the UI library's simple format)
 * 2. Emitting 'view' events via useMediaEvents when the lightbox opens
 * 3. Emitting 'download' events when the user clicks download
 * 4. Providing the consumer markup that renders the actual lightbox UI
 */
export function MediaLightbox({
  items,
  initialIndex,
  isOpen,
  onClose,
  mediaType,
}: MediaLightboxProps): React.JSX.Element | null {
  const { emitView, emitDownload } = useMediaEvents();

  // Convert SDK items to lightbox items
  const lightboxItems: LightboxItem[] = items.map((item) =>
    mediaType === 'photo'
      ? toPhotoLightboxItem(item as Photo)
      : toVideoLightboxItem(item as Video)
  );

  const lb = useLightbox({
    items: lightboxItems,
    initialIndex,
    isOpen,
    onClose,
    onDownload: (item) => {
      const downloadUrl = (item.type === 'video' && item.videoSrc) ? item.videoSrc : item.src;
      emitDownload({ mediaType: item.type, id: Number(item.id), url: downloadUrl });

      // Trigger actual browser download
      fetch(downloadUrl)
        .then((response) => response.blob())
        .then((blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          const extension = item.type === 'video' ? 'mp4' : 'jpg';
          a.download = `${item.type}-${item.id}.${extension}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        })
        .catch(() => {
          // Fallback to opening in a new tab if CORS blocks fetch
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          a.click();
        });
    },
  });

  // Emit 'view' event when lightbox opens or navigates to a new item
  useEffect(() => {
    if (lb.isOpen && lb.currentItem) {
      emitView({ mediaType: lb.currentItem.type, id: Number(lb.currentItem.id) });
    }
  }, [lb.isOpen, lb.currentItem, emitView]);

  if (!lb.isOpen) return null;

  // Render into a portal so the overlay is above everything
  return createPortal(
    <>
      {/* Overlay — getOverlayProps provides: role=dialog, aria-modal, click-outside */}
      <div {...lb.getOverlayProps()} className="lightbox-overlay">
        {/* Content — getContentProps stops click propagation */}
        <div {...lb.getContentProps()} className="lightbox-content">
          {lb.currentItem?.type === 'video' && lb.currentItem.videoSrc ? (
            <video
              src={lb.currentItem.videoSrc}
              controls
              autoPlay
              loop
              playsInline
              poster={lb.currentItem.src}
              aria-label={lb.currentItem.alt ?? 'Video'}
            />
          ) : (
            <img
              src={lb.currentItem?.src ?? ''}
              alt={lb.currentItem?.alt ?? ''}
            />
          )}
        </div>

        {/* Controls overlay */}
        <div className="lightbox-controls">
          <button
            ref={lb.initialFocusRef}
            {...lb.getDownloadButtonProps()}
            className="lightbox-btn"
            id="lightbox-download"
          >
            ↓ Download
          </button>
          <button
            {...lb.getCloseButtonProps()}
            className="lightbox-btn"
            id="lightbox-close"
          >
            ✕ Close
          </button>
        </div>

        {/* Navigation */}
        {lightboxItems.length > 1 && (
          <>
            <div className="lightbox-nav lightbox-nav-prev">
              <button
                {...lb.getPrevProps()}
                className="lightbox-nav-btn"
                id="lightbox-prev"
              >
                ‹
              </button>
            </div>
            <div className="lightbox-nav lightbox-nav-next">
              <button
                {...lb.getNextProps()}
                className="lightbox-nav-btn"
                id="lightbox-next"
              >
                ›
              </button>
            </div>
          </>
        )}

        {/* Caption */}
        {lb.currentItem?.alt && (
          <div className="lightbox-caption" aria-hidden="true">
            {lb.currentItem.alt}
            {lightboxItems.length > 1 && (
              <span> ({lb.currentIndex + 1} / {lightboxItems.length})</span>
            )}
          </div>
        )}
      </div>
    </>,
    document.body
  );
}
