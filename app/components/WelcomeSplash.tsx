'use client';

import { useEffect, useRef, useState } from 'react';
import AmanahLogo from '../AmanahLogo';

type WelcomeStage = 'salaam' | 'bismillah' | 'leaving' | 'done';

/**
 * A brief two-part welcome shown once when a document boots.
 * Internal Next.js navigation keeps this mounted, so the greeting does not replay.
 * This is a welcome sequence, not a simulated network-loading indicator.
 */
export default function WelcomeSplash() {
  const [stage, setStage] = useState<WelcomeStage>('salaam');
  const timeouts = useRef<number[]>([]);

  useEffect(() => {
    // Each message remains visible for at least five full seconds,
    // even after its short entrance transition. Reduced-motion visitors
    // keep the same reading time, with the animation handled by CSS.
    const greetingDuration = 5400;
    const secondDuration = 10800;
    const finishDuration = 11200;

    timeouts.current = [
      window.setTimeout(() => setStage('bismillah'), greetingDuration),
      window.setTimeout(() => setStage('leaving'), secondDuration),
      window.setTimeout(() => setStage('done'), finishDuration),
    ];

    return () => {
      timeouts.current.forEach(window.clearTimeout);
      timeouts.current = [];
    };
  }, []);

  const skip = () => {
    timeouts.current.forEach(window.clearTimeout);
    timeouts.current = [];
    setStage('done');
  };

  if (stage === 'done') return null;

  const isBismillah = stage !== 'salaam';

  return (
    <div
      className="amanah-welcome"
      data-stage={stage}
      role="region"
      aria-label="Amanah Giving welcome"
    >
      <div className="amanah-welcome-ornament" aria-hidden="true" />
      <button
        type="button"
        className="amanah-welcome-skip"
        onClick={skip}
        aria-label="Skip welcome introduction"
      >
        Skip intro
        <span aria-hidden="true">→</span>
      </button>

      <div className="amanah-welcome-content">
        <div className="amanah-welcome-brand">
          <AmanahLogo variant="light" size="lg" showTagline />
        </div>
        <div className="amanah-welcome-rule" aria-hidden="true"><span /></div>
        <div className="amanah-welcome-message-block" key={isBismillah ? 'bismillah' : 'salaam'}>
          <p className="amanah-welcome-eyebrow">
            {isBismillah ? 'BEGIN WITH INTENTION' : 'WELCOME TO AMANAH GIVING'}
          </p>
          <p className="amanah-welcome-arabic" lang="ar" dir="rtl" aria-hidden="true">
            {isBismillah ? 'بِسْمِ اللَّهِ' : 'السَّلَامُ عَلَيْكُمْ'}
          </p>
          <p className="amanah-welcome-message" aria-live="polite" aria-atomic="true">
            {isBismillah ? 'Bismillah!' : 'Assalaam Alaykum!'}
          </p>
          <p className="amanah-welcome-translation">
            {isBismillah ? 'In the name of Allah' : 'Peace be upon you'}
          </p>
        </div>
        <div className="amanah-welcome-stages" aria-label={isBismillah ? 'Welcome stage two of two' : 'Welcome stage one of two'}>
          <span className="amanah-welcome-stage is-current" aria-hidden="true" />
          <span className={`amanah-welcome-stage${isBismillah ? ' is-current' : ''}`} aria-hidden="true" />
        </div>
      </div>
      <div className="amanah-welcome-footer">GIVE WITH AMANAH <span aria-hidden="true">·</span> SEE THE IMPACT</div>
    </div>
  );
}
