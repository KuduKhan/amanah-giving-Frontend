'use client';

import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import Icon from './Icon';

type Category = readonly [label: string, icon: string];

type Props = {
  options: readonly Category[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

/**
 * Compact category listbox with genuine per-option icons.
 * Native select options cannot consistently render SVG icons across browsers.
 * This control implements pointer, Tab, Escape, Arrow, Home/End and type-to-select
 * keyboard behavior, keeping focus and the current selection explicit.
 */
export default function CategoryDropdown({ options, value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find(([name]) => name === value) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex(([name]) => name === value));

  const focusOption = (index: number) => {
    const all = menuRef.current?.querySelectorAll<HTMLButtonElement>('.cause-category-option');
    if (all?.length) all[(index + all.length) % all.length]?.focus();
  };
  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focusOption(selectedIndex));
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, selectedIndex]);

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (event.target === triggerRef.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
      }
      return;
    }
    const entries = menuRef.current?.querySelectorAll<HTMLButtonElement>('.cause-category-option');
    const focusedIndex = entries ? [...entries].findIndex(node => node === document.activeElement) : -1;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      event.stopPropagation();
      focusOption((focusedIndex < 0 ? selectedIndex : focusedIndex) + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOption(event.key === 'Home' ? 0 : options.length - 1);
    } else if ((event.key === 'Enter' || event.key === ' ') && focusedIndex >= 0) {
      event.preventDefault();
      choose(options[focusedIndex][0]);
    } else if (event.key.length === 1 && /^[a-z]$/i.test(event.key)) {
      const letter = event.key.toLowerCase();
      const next = options.findIndex(([name], i) => i > focusedIndex && name.toLowerCase().startsWith(letter));
      const first = options.findIndex(([name]) => name.toLowerCase().startsWith(letter));
      if (next !== -1 || first !== -1) {
        event.preventDefault();
        focusOption(next !== -1 ? next : first);
      }
    }
  };

  return (
    <div
      ref={rootRef}
      className={`cause-category-select ${className}`}
      data-filtered={value !== 'All'}
      data-open={open}
      onKeyDown={handleKey}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cause-category-trigger"
        aria-label={`${label}: ${value === 'All' ? 'All causes' : value}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen(wasOpen => !wasOpen)}
      >
        <span className="cause-category-current-icon"><Icon name={selected[1]}/></span>
        <span className="cause-category-current-label">{value === 'All' ? 'All causes' : value}</span>
        <Icon name="chevron" className="cause-category-caret"/>
      </button>
      {open && (
        <div ref={menuRef} id={listboxId} className="cause-category-menu" role="listbox" aria-label={label}>
          {options.map(([name, icon]) => (
            <button
              type="button"
              key={name}
              role="option"
              tabIndex={-1}
              aria-selected={name === value}
              data-category={name}
              className="cause-category-option"
              onClick={() => choose(name)}
            >
              <span className="cause-category-option-icon"><Icon name={icon}/></span>
              <span>{name === 'All' ? 'All causes' : name}</span>
              {name === value && <Icon name="check" className="cause-category-check"/>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
