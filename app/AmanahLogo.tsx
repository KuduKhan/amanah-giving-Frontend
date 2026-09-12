import type { CSSProperties } from 'react';

type Props = {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
};

/** Shared Amanah Giving logo lockup, using the supplied transparent brand mark. */
export default function AmanahLogo({ variant = 'dark', size = 'md', showTagline = true, className = '' }: Props) {
  const palette = variant === 'light'
    ? { ink: '#f8fcfa', accent: '#8bd1b4', gold: '#d8b66d', ring: '#6e9a8b' }
    : { ink: '#071a2c', accent: '#0f795d', gold: '#b48636', ring: '#bfd2c9' };
  const css = { '--logo-ink': palette.ink, '--logo-accent': palette.accent, '--logo-gold': palette.gold, '--logo-ring': palette.ring } as CSSProperties;
  return <span className={`amanah-logo amanah-logo-${size} amanah-logo-${variant} ${className}`} style={css} aria-label="Amanah Giving">
    <img className="amanah-logo-mark" src="/amanah-logo.png" alt="" role="presentation" />
    <span className="amanah-logo-wordmark"><b>AMANAH</b>{showTagline && <small>GIVING</small>}</span>
  </span>;
}
