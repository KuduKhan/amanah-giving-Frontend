'use client';

import { KeyboardEvent, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from './Icon';

type Category = readonly [label: string, icon: string];

type Props = {
  options: readonly Category[];
  value: string;
  onChange: (value: string) => void;
  label: string;
  className?: string;
};

type MenuGeometry = {
  left: number;
  top: number;
  width: number;
  maxHeight: number;
  direction: 'up' | 'down';
};

/**
 * Accessible category dropdown shared by the homepage and search dialog.
 * Its portal keeps the menu clear of overflow-clipped and stacking containers;
 * viewport-aware positioning flips and scrolls it on short or narrow screens.
 */
export default function CategoryDropdown({ options, value, onChange, label, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const [geometry, setGeometry] = useState<MenuGeometry | null>(null);
  const [menuHost, setMenuHost] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const selected = options.find(([name]) => name === value) ?? options[0];
  const selectedIndex = Math.max(0, options.findIndex(([name]) => name === value));

  const focusOption = (index: number) => {
    const entries = menuRef.current?.querySelectorAll<HTMLButtonElement>('.cause-category-option');
    if (!entries?.length) return;
    const next = entries[(index + entries.length) % entries.length];
    next.focus({ preventScroll: true });
    next.scrollIntoView({ block: 'nearest' });
  };

  const openMenu = () => {
    setMenuHost(rootRef.current?.closest<HTMLElement>('[aria-modal="true"]') ?? document.body);
    setGeometry(null);
    setOpen(true);
  };

  const choose = (next: string) => {
    onChange(next);
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };

  // Position relative to the visible (including on-screen-keyboard) viewport.
  // Recalculate after any ancestor scroll, resize, or trigger/menu size change.
  useLayoutEffect(() => {
    if (!open) return;
    let frame = 0;
    const position = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;

      const rect = trigger.getBoundingClientRect();
      const viewport = window.visualViewport;
      const viewLeft = viewport?.offsetLeft ?? 0;
      const viewTop = viewport?.offsetTop ?? 0;
      const viewWidth = viewport?.width ?? document.documentElement.clientWidth;
      const viewHeight = viewport?.height ?? window.innerHeight;
      const inset = 8;
      const gap = 8;
      const width = Math.min(Math.max(rect.width, 224), Math.max(0, viewWidth - 2 * inset));
      const left = Math.max(viewLeft + inset, Math.min(rect.right - width, viewLeft + viewWidth - width - inset));
      const down = Math.max(0, viewTop + viewHeight - rect.bottom - gap - inset);
      const up = Math.max(0, rect.top - viewTop - gap - inset);
      const desiredHeight = Math.min(menu.scrollHeight, 366);
      const direction: 'up' | 'down' = down >= desiredHeight || down >= up ? 'down' : 'up';
      const maxHeight = Math.min(366, direction === 'down' ? down : up);
      const shownHeight = Math.min(desiredHeight, maxHeight);
      const top = direction === 'down' ? rect.bottom + gap : rect.top - gap - shownHeight;
      const next = { left, top, width, maxHeight, direction };
      setGeometry(previous =>
        previous && Object.keys(next).every(key =>
          previous[key as keyof MenuGeometry] === next[key as keyof MenuGeometry]
        ) ? previous : next
      );
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(position);
    };

    position();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(schedule) : null;
    if (triggerRef.current) observer?.observe(triggerRef.current);
    if (menuRef.current) observer?.observe(menuRef.current);
    window.addEventListener('resize', schedule);
    window.addEventListener('scroll', schedule, true);
    window.visualViewport?.addEventListener('resize', schedule);
    window.visualViewport?.addEventListener('scroll', schedule);

    return () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener('resize', schedule);
      window.removeEventListener('scroll', schedule, true);
      window.visualViewport?.removeEventListener('resize', schedule);
      window.visualViewport?.removeEventListener('scroll', schedule);
    };
  }, [open, options.length]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => focusOption(selectedIndex));
    const isWithin = (target: EventTarget | null) =>
      target instanceof Node &&
      (!!rootRef.current?.contains(target) || !!menuRef.current?.contains(target));
    const onPointerDown = (event: PointerEvent) => {
      if (!isWithin(event.target)) setOpen(false);
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!isWithin(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [open, selectedIndex]);

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!open) {
      if (event.target === triggerRef.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
        event.preventDefault();
        event.stopPropagation();
        openMenu();
      }
      return;
    }
    const entries = menuRef.current?.querySelectorAll<HTMLButtonElement>('.cause-category-option');
    const focusedIndex = entries ? [...entries].findIndex(node => node === document.activeElement) : -1;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
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
      className={['cause-category-select', className].filter(Boolean).join(' ')}
      data-filtered={value !== 'All'}
      data-open={open}
      onKeyDown={handleKey}
      onBlurCapture={event => {
        const target = event.relatedTarget as Node | null;
        if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className="cause-category-trigger"
        aria-label={label + ': ' + (value === 'All' ? 'All causes' : value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => open ? setOpen(false) : openMenu()}
      >
        <span className="cause-category-current-icon"><Icon name={selected[1]}/></span>
        <span className="cause-category-current-label">{value === 'All' ? 'All causes' : value}</span>
        <Icon name="chevron" className="cause-category-caret"/>
      </button>
      {open && menuHost && createPortal(
        <div
          ref={menuRef}
          id={listboxId}
          className="cause-category-menu"
          data-floating-category-menu="true"
          data-placement={geometry?.direction ?? 'down'}
          role="listbox"
          aria-label={label}
          style={{
            position: 'fixed',
            left: geometry?.left ?? 0,
            top: geometry?.top ?? 0,
            width: geometry?.width ?? 224,
            maxHeight: geometry?.maxHeight ?? 0,
            visibility: geometry ? 'visible' : 'hidden',
          }}
        >
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
        </div>,
        menuHost
      )}
    </div>
  );
}
