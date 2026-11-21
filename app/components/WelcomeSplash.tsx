'use client';

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import AmanahLogo from '../AmanahLogo';

type WelcomeStage = 'salaam' | 'bismillah' | 'leaving' | 'done';

const FIRST_MESSAGE_MS = 5000;
const SECOND_MESSAGE_MS = 5000;
const EXIT_FADE_MS = 400;

/**
 * Two intentional greetings at document startup, with a timeline that reflects
 * the presentation time of each message (not network-loading progress).
 * The root layout persists during internal Next.js navigation, so this plays
 * only once for the current document. The user can skip at any time.
 */
export default function WelcomeSplash() {
  const [stage, setStage] = useState<WelcomeStage>('salaam');
  const [timelineStarted, setTimelineStarted] = useState(false);
  const [welcomeNoticeVisible, setWelcomeNoticeVisible] = useState(false);
  const skipRequested = useRef(false);
  const noticeTimeout = useRef<number | null>(null);
  const timeouts = useRef<number[]>([]);
  const skipButton = useRef<HTMLButtonElement>(null);
  const originalOverflow = useRef('');
  const welcomeActive = stage !== 'done';

  useEffect(() => {
    if (!welcomeActive) return;
    const pages = [...document.querySelectorAll('main')];
    const previousInert = pages.map(page => page.inert);
    pages.forEach(page => { page.inert = true; });
    return () => {
      pages.forEach((page, index) => { page.inert = previousInert[index]; });
    };
  }, [welcomeActive]);

  const clearTimers = () => {
    for (const id of timeouts.current) window.clearTimeout(id);
    timeouts.current = [];
  };

  const finish = () => {
    skipRequested.current = true;
    clearTimers();
    setStage('done');
  };

  useEffect(() => {
    originalOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keep keyboard focus on the welcome dialog, not on the obscured page.
    skipButton.current?.focus({ preventScroll: true });
    // Start progress on the next paint; avoid cascading effect renders.
    const progressFrame = window.requestAnimationFrame(() => setTimelineStarted(true));

    timeouts.current = [
      window.setTimeout(() => setStage('bismillah'), FIRST_MESSAGE_MS),
      // Fade during the final 400ms of Bismillah, not after it.
      window.setTimeout(() => setStage('leaving'), FIRST_MESSAGE_MS + SECOND_MESSAGE_MS - EXIT_FADE_MS),
      window.setTimeout(() => setStage('done'), FIRST_MESSAGE_MS + SECOND_MESSAGE_MS),
    ];

    return () => {
      clearTimers();
      window.cancelAnimationFrame(progressFrame);
      if (noticeTimeout.current !== null) window.clearTimeout(noticeTimeout.current);
      document.body.style.overflow = originalOverflow.current;
    };
  }, []);

  useEffect(() => {
    if (stage !== 'done') return;

    document.body.style.overflow = originalOverflow.current;

    // Only move focus when visitors actively choose to skip. The old
    // fallback focused the hidden "Skip to main content" accessibility link,
    // making it look like an unwanted notification after automatic completion.
    if (skipRequested.current) {
      const main = document.getElementById('main-content');
      if (main) {
        main.tabIndex = -1;
        main.focus({ preventScroll: true });
      }
    }

    // An explicit Skip intro request should open the app immediately, without
    // adding a second toast that can cover the content the visitor requested.
    if (skipRequested.current) return;

    // Keep the small welcome acknowledgment only after the full timed greeting.
    const noticeFrame = window.requestAnimationFrame(() => setWelcomeNoticeVisible(true));
    noticeTimeout.current = window.setTimeout(() => setWelcomeNoticeVisible(false), 2600);
    return () => {
      window.cancelAnimationFrame(noticeFrame);
      if (noticeTimeout.current !== null) window.clearTimeout(noticeTimeout.current);
    };
  }, [stage]);

  if (stage === 'done') {
    return welcomeNoticeVisible ? (
      <div className="amanah-welcome-notice" role="status" aria-live="polite" aria-atomic="true">
        <span className="amanah-welcome-notice-symbol" aria-hidden="true">✦</span>
        <span className="amanah-welcome-notice-copy">
          <strong>Welcome to Amanah Giving</strong>
          <small>Give with intention. See the impact.</small>
        </span>
      </div>
    ) : null;
  }

  const second = stage !== 'salaam';

  return (
    <div
      className="amanah-welcome"
      data-stage={stage}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Amanah Giving"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          finish();
        }
        if (event.key === 'Tab') {
          event.preventDefault();
          skipButton.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div className="amanah-welcome-ornament" aria-hidden="true">
        <span />
      </div>

      <button
        type="button"
        ref={skipButton}
        className="amanah-welcome-skip"
        onClick={finish}
        aria-label="Skip welcome introduction and open Amanah Giving"
      >
        <span>Skip intro</span>
        <svg viewBox="0 0 20 20" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M4.2 10h11.3m-4.6-4.6 4.6 4.6-4.6 4.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="amanah-welcome-content">
        <div className="amanah-welcome-brand">
          <AmanahLogo variant="light" size="lg" showTagline />
        </div>

        <div className="amanah-welcome-divider" aria-hidden="true">
          <span />
          <svg viewBox="0 0 32 32" width="25" height="25" fill="none">
            <path d="M16 2.5 20.1 11.9 29.5 16l-9.4 4.1L16 29.5l-4.1-9.4L2.5 16l9.4-4.1L16 2.5Z" stroke="currentColor" strokeWidth="1.1" />
            <circle cx="16" cy="16" r="3.2" fill="currentColor" />
          </svg>
          <span />
        </div>

        <div className="amanah-welcome-panel">
          <div className="amanah-welcome-panel-edge" aria-hidden="true" />
          <div className="amanah-welcome-announcer" aria-live="polite" aria-atomic="true">
            <div className="amanah-welcome-message-block" key={second ? 'bismillah' : 'salaam'}>
              <p className="amanah-welcome-eyebrow">
                {second ? 'BEGIN WITH INTENTION' : 'PEACE AND WELCOME'}
              </p>
              <p className="amanah-welcome-arabic" lang="ar" dir="rtl">
                {second ? 'بِسْمِ اللَّهِ' : 'السَّلَامُ عَلَيْكُمْ'}
              </p>
              <p className="amanah-welcome-message">
                {second ? 'Bismillah!' : 'Assalaam Alaykum!'}
              </p>
              <p className="amanah-welcome-translation">
                {second ? 'In the name of Allah' : 'Peace be upon you'}
              </p>
            </div>
          </div>
        </div>

        <div
          className={`amanah-welcome-steps${timelineStarted ? ' is-running' : ''}`}
          role="group"
          aria-label={second ? 'Bismillah — second welcome stage' : 'Salaam — first welcome stage'}
          style={{ '--welcome-step-duration': `${FIRST_MESSAGE_MS}ms` } as CSSProperties}
        >
          <div className={'amanah-welcome-step ' + (second ? 'is-complete' : 'is-current')} aria-hidden="true">
            <div className="amanah-welcome-step-heading">
              <span className="amanah-welcome-step-index">01</span>
              <span className="amanah-welcome-step-label">Salaam</span>
              <span className="amanah-welcome-step-state">{second ? '✓' : '●'}</span>
            </div>
            <span className="amanah-welcome-step-track"><span className="amanah-welcome-step-fill" /></span>
          </div>
          <div className={'amanah-welcome-step ' + (second ? 'is-current' : 'is-upcoming')} aria-hidden="true">
            <div className="amanah-welcome-step-heading">
              <span className="amanah-welcome-step-index">02</span>
              <span className="amanah-welcome-step-label">Bismillah</span>
              <span className="amanah-welcome-step-state">{second ? '●' : '○'}</span>
            </div>
            <span className="amanah-welcome-step-track"><span className="amanah-welcome-step-fill" /></span>
          </div>
        </div>
      </div>

      <p className="amanah-welcome-footer">
        GIVE WITH AMANAH <span aria-hidden="true">·</span> SEE THE IMPACT
      </p>
    </div>
  );
}
