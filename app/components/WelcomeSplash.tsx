'use client';

import { useEffect, useRef, useState } from 'react';
import AmanahLogo from '../AmanahLogo';

type WelcomeStage = 'salaam' | 'bismillah' | 'leaving' | 'done';

const FIRST_MESSAGE_MS = 5400;
const SECOND_MESSAGE_MS = 5400;
const EXIT_FADE_MS = 400;

/**
 * Two intentional greetings at document startup, not a simulated loading bar.
 * The root layout persists during internal Next.js navigation, so this plays
 * only once for the current document. The user can skip at any time.
 */
export default function WelcomeSplash() {
  const [stage, setStage] = useState<WelcomeStage>('salaam');
  const timeouts = useRef<number[]>([]);
  const skipButton = useRef<HTMLButtonElement>(null);
  const originalOverflow = useRef('');

  const clearTimers = () => {
    for (const id of timeouts.current) window.clearTimeout(id);
    timeouts.current = [];
  };

  const finish = () => {
    clearTimers();
    setStage('done');
  };

  useEffect(() => {
    originalOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Keep keyboard focus on the welcome dialog, not on the obscured page.
    skipButton.current?.focus({ preventScroll: true });

    timeouts.current = [
      window.setTimeout(() => setStage('bismillah'), FIRST_MESSAGE_MS),
      window.setTimeout(() => setStage('leaving'), FIRST_MESSAGE_MS + SECOND_MESSAGE_MS),
      window.setTimeout(() => setStage('done'), FIRST_MESSAGE_MS + SECOND_MESSAGE_MS + EXIT_FADE_MS),
    ];

    return () => {
      clearTimers();
      document.body.style.overflow = originalOverflow.current;
    };
  }, []);

  useEffect(() => {
    if (stage !== 'done') return;

    document.body.style.overflow = originalOverflow.current;

    // Transfer keyboard focus to the visible page after the overlay is removed.
    const firstPageLink = document.querySelector<HTMLElement>('.site-header .brand, header a[href], main a[href]');
    firstPageLink?.focus({ preventScroll: true });
  }, [stage]);

  if (stage === 'done') return null;

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

        <div className="amanah-welcome-steps" aria-label={second ? 'Second of two welcome messages' : 'First of two welcome messages'}>
          <div className={'amanah-welcome-step ' + (second ? 'is-complete' : 'is-current')} aria-hidden="true">
            <span className="amanah-welcome-step-index">01</span>
            <span className="amanah-welcome-step-track" />
            <span className="amanah-welcome-step-label">Salaam</span>
          </div>
          <div className={'amanah-welcome-step ' + (second ? 'is-current' : 'is-upcoming')} aria-hidden="true">
            <span className="amanah-welcome-step-index">02</span>
            <span className="amanah-welcome-step-track" />
            <span className="amanah-welcome-step-label">Bismillah</span>
          </div>
        </div>
      </div>

      <p className="amanah-welcome-footer">
        GIVE WITH AMANAH <span aria-hidden="true">·</span> SEE THE IMPACT
      </p>
    </div>
  );
}
