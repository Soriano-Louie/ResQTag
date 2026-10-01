import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Freezes page scrolling while a modal is open.
 * Uses the fixed-position technique so iOS Safari cannot scroll the page behind
 * the overlay, and restores the exact scroll position on close.
 */
function useBodyScrollLock(active) {
  useEffect(() => {
    if (!active) return;

    const { body } = document;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflowY: body.style.overflowY,
      paddingRight: body.style.paddingRight
    };

    // Compensate for the removed scrollbar so the page behind does not shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflowY = 'scroll';
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflowY = previous.overflowY;
      body.style.paddingRight = previous.paddingRight;
      window.scrollTo(0, scrollY);
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