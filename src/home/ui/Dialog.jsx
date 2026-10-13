import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import useMotionPreference from '../useMotionPreference.js';
import { X } from 'lucide-react';
import './primitives.css';

let pageScrollLocks = 0;
let restorePageScroll;

function lockPageScroll() {
  if (pageScrollLocks === 0) {
    const body = document.body;
    const root = document.documentElement;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const originalWidth = root.clientWidth;
    const paddingRight = Number.parseFloat(getComputedStyle(body).paddingRight) || 0;
    const bodyProperties = ['position', 'top', 'left', 'width', 'overflow', 'paddingRight'];
    const originalBody = Object.fromEntries(bodyProperties.map(property => [property, body.style[property]]));
    const originalRootOverflow = root.style.overflow;

    root.style.overflow = 'hidden';
    const scrollbarCompensation = Math.max(0, root.clientWidth - originalWidth);
    Object.assign(body.style, {
      position: 'fixed',
      top: `${-scrollY}px`,
      left: `${-scrollX}px`,
      width: '100%',
      overflow: 'hidden',
      paddingRight: `${paddingRight + scrollbarCompensation}px`,
    });

    restorePageScroll = () => {
      Object.assign(body.style, originalBody);
      root.style.overflow = originalRootOverflow;
      window.scrollTo({ left: scrollX, top: scrollY, behavior: 'instant' });
    };
  }

  pageScrollLocks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    pageScrollLocks -= 1;
    if (pageScrollLocks === 0) {
      restorePageScroll?.();
      restorePageScroll = undefined;
    }
  };
}

export default function Dialog({ title, onClose, children, description }) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const mountedRef = useRef(false);
  const closingRef = useRef(false);
  const completedRef = useRef(false);
  const closeTimer = useRef(null);
  const backdropPointer = useRef(null);
  const reducedMotion = useMotionPreference();
  const [closing, setClosing] = useState(false);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const releaseScroll = lockPageScroll();
    mountedRef.current = true;
    dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });

    return () => {
      mountedRef.current = false;
      clearTimeout(closeTimer.current);
      if (dialog.open) dialog.close();
      releaseScroll();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  function finishClose() {
    if (!mountedRef.current || completedRef.current) return;
    completedRef.current = true;
    if (dialogRef.current?.open) dialogRef.current.close();
    onCloseRef.current();
  }

  function requestClose() {
    if (closingRef.current) return;
    closingRef.current = true;
    if (reducedMotion) finishClose();
    else {
      setClosing(true);
      closeTimer.current = setTimeout(finishClose, 160);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="xt-ui-dialog"
      data-closing={closing || undefined}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => {
        event.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // 严格模式重新挂载时，忽略上一次关闭排队触发的事件。
        if (!dialogRef.current?.open) finishClose();
      }}
      onPointerDown={event => {
        backdropPointer.current = event.target === event.currentTarget && event.isPrimary && event.button === 0
          ? { id: event.pointerId, x: event.clientX, y: event.clientY }
          : null;
      }}
      onPointerUp={event => {
        const pointer = backdropPointer.current;
        backdropPointer.current = null;
        if (pointer?.id === event.pointerId && event.target === event.currentTarget
          && Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) < 8) requestClose();
      }}
      onPointerCancel={() => { backdropPointer.current = null; }}
    >
      <section className="xt-ui-dialog-panel">
        <header className="xt-ui-dialog-header">
          <div>
            <h2 ref={titleRef} id={titleId} className="xt-ui-dialog-title" tabIndex={-1}>{title}</h2>
            {description && <p id={descriptionId} className="xt-ui-dialog-description">{description}</p>}
          </div>
          <button type="button" className="xt-ui-dialog-close" aria-label="关闭对话框" onClick={requestClose}>
            <X size={20} aria-hidden="true" />
          </button>
        </header>
        <div className="xt-ui-dialog-body">{children}</div>
      </section>
    </dialog>
  );
}
