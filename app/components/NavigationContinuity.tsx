'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Icon from '../Icon';

const ORIGIN_PREFIX = 'amanah-navigation-origin-v1:';
const RESTORE_KEY = 'amanah-navigation-restore-v1';
const MAX_AGE_MS = 30 * 60 * 1000;

type Origin = { from: string; top: number; at: number };
type Restore = { pathname: string; top: number; at: number };

function readSession<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch {
    return null;
  }
}

function fresh(at: unknown) {
  return typeof at === 'number' && at <= Date.now() && Date.now() - at < MAX_AGE_MS;
}

/**
 * Remembers the page and vertical position before following an internal route.
 * A back action returns through browser history and restores that specific point.
 * Hash-only navigation is left to the browser's normal handling.
 */
export default function NavigationContinuity() {
  const pathname = usePathname();

  useEffect(() => {
    const remember = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

      const destination = new URL(link.href, window.location.href);
      if (destination.origin !== window.location.origin) return;
      if (destination.pathname === window.location.pathname && destination.search === window.location.search) return;

      const source = window.location.pathname + window.location.search + window.location.hash;
      const entry: Origin = { from: source, top: window.scrollY, at: Date.now() };
      try { window.sessionStorage.setItem(ORIGIN_PREFIX + destination.pathname, JSON.stringify(entry)); }
      catch { /* Browser storage may be disabled; normal links still work. */ }
    };
    document.addEventListener('click', remember, true);
    return () => document.removeEventListener('click', remember, true);
  }, []);

  useEffect(() => {
    const saved = readSession<Restore>(RESTORE_KEY);
    if (!saved || saved.pathname !== pathname || !fresh(saved.at) || !Number.isFinite(saved.top) || saved.top < 0) return;
    try { window.sessionStorage.removeItem(RESTORE_KEY); }
    catch { /* Restoration can still work in the current render. */ }

    // Wait for the destination route to paint before restoring its previous position.
    const restore = () => window.scrollTo({ top: saved.top, behavior: 'instant' });
    let secondFrame = 0;
    const firstFrame = requestAnimationFrame(() => { secondFrame = requestAnimationFrame(restore); });
    const settle = window.setTimeout(restore, 160);
    return () => {
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.clearTimeout(settle);
    };
  }, [pathname]);

  return null;
}

/** A genuine back control, rather than an unconditional link to the homepage. */
export function BackToPrevious() {
  const pathname = usePathname();
  const router = useRouter();

  const goBack = () => {
    const origin = readSession<Origin>(ORIGIN_PREFIX + pathname);
    if (origin && typeof origin.from === 'string' && fresh(origin.at) &&
      Number.isFinite(origin.top) && origin.top >= 0) {
      const source = new URL(origin.from, window.location.origin);
      if (source.origin === window.location.origin && source.pathname !== pathname) {
        const restore: Restore = { pathname: source.pathname, top: origin.top, at: Date.now() };
        try { window.sessionStorage.setItem(RESTORE_KEY, JSON.stringify(restore)); }
        catch { /* Router navigation remains available even without session storage. */ }
        if (window.history.length > 1) {
          router.back();
        } else {
          router.replace(origin.from, { scroll: false });
        }
        return;
      }
    }

    // Direct visits have no known in-app origin. Do not navigate to an unrelated external site.
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin && window.history.length > 1) {
        router.back();
        return;
      }
    } catch { /* Referrer can be absent or invalid. */ }
    router.push('/');
  };

  return (
    <button type="button" className="seo-back-button" onClick={goBack} aria-label="Go back to the previous page and position">
      <span className="seo-back-icon" aria-hidden="true"><Icon name="arrow-left" /></span>
      <span>Go back</span>
    </button>
  );
}
