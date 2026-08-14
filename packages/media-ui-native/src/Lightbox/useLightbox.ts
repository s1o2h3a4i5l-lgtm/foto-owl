import { useState, useEffect, useCallback, useRef } from 'react';
import type { ViewStyle } from 'react-native';

export interface LightboxItem {
  id: number | string;
  type: 'photo' | 'video';
  src: string;
  alt?: string;
  videoSrc?: string;
}

export interface UseLightboxProps {
  items: LightboxItem[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  onDownload?: (item: LightboxItem) => void;
}

export interface UseLightboxResult {
  currentIndex: number;
  currentItem: LightboxItem | null;
  isOpen: boolean;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;

  /**
   * Props for the React Native Modal component.
   * Provides: visible, transparent, onRequestClose (Android back button),
   * animationType, accessibilityViewIsModal.
   */
  getModalProps: () => {
    visible: boolean;
    transparent: boolean;
    onRequestClose: () => void;
    animationType: 'fade' | 'slide' | 'none';
    accessibilityViewIsModal: boolean;
  };

  /** Props for close button (TouchableOpacity) */
  getCloseButtonProps: () => {
    onPress: () => void;
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityRole: 'button';
  };

  /** Props for previous button */
  getPrevProps: () => {
    onPress: () => void;
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityRole: 'button';
    disabled: boolean;
  };

  /** Props for next button */
  getNextProps: () => {
    onPress: () => void;
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityRole: 'button';
    disabled: boolean;
  };

  /** Props for download button */
  getDownloadButtonProps: () => {
    onPress: () => void;
    accessible: boolean;
    accessibilityLabel: string;
    accessibilityRole: 'button';
  };

  /** Style for the overlay — consumer applies as backgroundColor/opacity */
  overlayStyle: ViewStyle;
}

/**
 * useLightbox (React Native) — headless lightbox for Modal.
 *
 * Adapts the web useLightbox pattern to React Native:
 * - getModalProps() for <Modal> instead of getOverlayProps() for <div>
 * - onRequestClose handles Android hardware back button
 * - No focus trap (RN handles modal focus natively)
 * - No keyboard events (RN gesture system)
 *
 * Zero styles — overlayStyle gives you a starting point but you control it.
 */
export function useLightbox({
  items,
  initialIndex = 0,
  isOpen,
  onClose,
  onDownload,
}: UseLightboxProps): UseLightboxResult {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (isOpen) setCurrentIndex(initialIndex);
  }, [isOpen, initialIndex]);

  const currentItem = isOpen ? (items[currentIndex] ?? null) : null;

  const goTo = useCallback(
    (index: number) => setCurrentIndex(Math.max(0, Math.min(index, items.length - 1))),
    [items.length]
  );
  const goNext = useCallback(
    () => setCurrentIndex((i) => (i < items.length - 1 ? i + 1 : 0)),
    [items.length]
  );
  const goPrev = useCallback(
    () => setCurrentIndex((i) => (i > 0 ? i - 1 : items.length - 1)),
    [items.length]
  );

  const getModalProps = useCallback(
    () => ({
      visible: isOpen,
      transparent: true,
      onRequestClose: onClose, // Android back button
      animationType: 'fade' as const,
      accessibilityViewIsModal: true,
    }),
    [isOpen, onClose]
  );

  const getCloseButtonProps = useCallback(
    () => ({
      onPress: onClose,
      accessible: true,
      accessibilityLabel: 'Close lightbox',
      accessibilityRole: 'button' as const,
    }),
    [onClose]
  );

  const getPrevProps = useCallback(
    () => ({
      onPress: goPrev,
      accessible: true,
      accessibilityLabel: 'Previous item',
      accessibilityRole: 'button' as const,
      disabled: items.length <= 1,
    }),
    [goPrev, items.length]
  );

  const getNextProps = useCallback(
    () => ({
      onPress: goNext,
      accessible: true,
      accessibilityLabel: 'Next item',
      accessibilityRole: 'button' as const,
      disabled: items.length <= 1,
    }),
    [goNext, items.length]
  );

  const getDownloadButtonProps = useCallback(
    () => ({
      onPress: () => currentItem && onDownload?.(currentItem),
      accessible: true,
      accessibilityLabel: `Download ${currentItem?.type ?? 'item'}`,
      accessibilityRole: 'button' as const,
    }),
    [currentItem, onDownload]
  );

  const overlayStyle: ViewStyle = {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  };

  return {
    currentIndex,
    currentItem,
    isOpen,
    goTo,
    goNext,
    goPrev,
    getModalProps,
    getCloseButtonProps,
    getPrevProps,
    getNextProps,
    getDownloadButtonProps,
    overlayStyle,
  };
}
