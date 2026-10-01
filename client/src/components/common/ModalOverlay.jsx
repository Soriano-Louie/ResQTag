import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Freezes page scrolling while a modal is open.
 *
 * Deliberately avoids the common `position: fixed` technique: fixing the body
 * takes it out of document flow, which collapses the document height to one
 * viewport. The browser then clamps `window.scrollY` to 0, so the page jumps to
 * the top when the modal opens and snaps back on close.
 *
 * Instead the page stays laid out exactly as it was and scrolling is disabled at
 * the source:
 *  - `overflow: hidden` on <html> and <body> blocks wheel/trackpad/keyboard
 *    scrolling and collapses the scrollbar.
 *  - `touch-action: none` on <body> blocks touch scrolling. The overlay is a
 *    child of <body>, but it re-enables vertical panning via the
 *    `.modal-overlay { touch-action: pan-y }` rule, so only the modal scrolls.
 *  - `overscroll-behavior: none` stops rubber-banding on iOS.
 *
 * Restoring the overflow values reveals the scrollbar again, so the page width
 * is compensated with padding-right to keep the layout from shifting sideways.
 */
function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const html = document.documentElement;
    const body = document.body;

    const previous = {
      htmlOverflow: html.style.overflow,
      htmlOverscrollBehavior: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyTouchAction: body.style.touchAction,
      bodyPaddingRight: body.style.paddingRight
    };

    // Width of the scrollbar that `overflow: hidden` is about to remove
    const scrollbarWidth = window.innerWidth - html.clientWidth;

    html.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overflow = 'hidden';
    body.style.touchAction = 'none';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      html.style.overflow = previous.htmlOverflow;
      html.style.overscrollBehavior = previous.htmlOverscrollBehavior;
      body.style.overflow = previous.bodyOverflow;
      body.style.touchAction = previous.bodyTouchAction;
      body.style.paddingRight = previous.bodyPaddingRight;
    };
  }, [active]);
}

/**
 * Full-viewport modal backdrop rendered into document.body via a portal.
 *
 * Rendering through a portal guarantees the overlay always sits above the whole
 * app (navbar included) regardless of any stacking context or transform applied
 * by an ancestor, and `dvh` keeps the backdrop exactly one screen tall on mobile
 * browsers where the URL bar resizes the viewport.
 */
export default function ModalOverlay({
  isOpen,
  onClose,
  onBackdropClick = true,
  children,
  className = ''
}) {
  useBodyScrollLock(Boolean(isOpen));

  useEffect(() => {
    if (!isOpen || !onClose) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (onBackdropClick && e.target === e.currentTarget && onClose) onClose();
  };

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className={`modal-overlay fixed inset-0 z-[100] h-[100dvh] w-screen overscroll-contain overflow-y-auto ${className}`}
    >
      {children}
    </div>,
    document.body
  );
}