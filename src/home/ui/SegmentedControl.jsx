import React, { useId, useRef } from 'react';
import { motion } from 'motion/react';
import useMotionPreference from '../useMotionPreference.js';
import './primitives.css';

export default function SegmentedControl({ label, value, onChange, options, className = '' }) {
  const instanceId = useId();
  const buttonRefs = useRef([]);
  const keyboardSelection = useRef(false);
  const reducedMotion = useMotionPreference();
  const selectedIndex = options.findIndex(option => option.id === value);
  const focusIndex = selectedIndex < 0 ? 0 : selectedIndex;

  function handleKeyDown(event, index) {
    let nextIndex;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % options.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + options.length) % options.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = options.length - 1;
    else return;

    event.preventDefault();
    keyboardSelection.current = true;
    const button = buttonRefs.current[nextIndex];
    button?.focus({ preventScroll: true });
    if (button) {
      const container = button.parentElement;
      const bounds = container.getBoundingClientRect();
      const item = button.getBoundingClientRect();
      // 只滚动分段控件，确保键盘焦点可见且页面保持原位。
      if (item.left < bounds.left) container.scrollLeft += item.left - bounds.left;
      else if (item.right > bounds.right) container.scrollLeft += item.right - bounds.right;
    }
    if (options[nextIndex].id !== value) onChange(options[nextIndex].id);
  }

  return (
    <div className={`xt-ui-segmented ${className}`} role="radiogroup" aria-label={label}>
      {options.map((option, index) => {
        const selected = option.id === value;
        return (
          <button
            key={option.id}
            ref={element => { buttonRefs.current[index] = element; }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={index === focusIndex ? 0 : -1}
            className="xt-ui-segmented-option"
            onKeyDown={event => handleKeyDown(event, index)}
            onPointerDown={() => { keyboardSelection.current = false; }}
            onClick={event => {
              keyboardSelection.current = event.detail === 0;
              if (!selected) onChange(option.id);
            }}
          >
            {selected && (
              <motion.span
                className="xt-ui-segmented-indicator"
                layoutId={`xt-segmented-${instanceId}`}
                aria-hidden="true"
                transition={{ duration: reducedMotion || keyboardSelection.current ? 0 : 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              />
            )}
            <span className="xt-ui-segmented-label">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
