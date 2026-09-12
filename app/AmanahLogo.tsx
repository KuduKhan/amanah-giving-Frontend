import type { CSSProperties } from 'react';

type Props = {
  variant?: 'light' | 'dark';
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  className?: string;
};

/** Amanah's shared mark: an open arch, crescent and A monogram representing trust, shelter and intention. */
export default function AmanahLogo({ variant = 'dark', size = 'md', showTagline = true, className = '' }: Props) {
  const palette = variant === 'light'
    ? { ink: '#f8fcfa', accent: '#8bd1b4', gold: '#d8b66d', ring: '#6e9a8b' }
    : { ink: '#071a2c', accent: '#0f795d', gold: '#b48636', ring: '#bfd2c9' };
  const css = { '--logo-ink': palette.ink, '--logo-accent': palette.accent, '--logo-gold': palette.gold, '--logo-ring': palette.ring } as CSSProperties;
  return <span className={`amanah-logo amanah-logo-${size} amanah-logo-${variant} ${className}`} style={css} aria-label="Amanah Giving">
    <svg className="amanah-logo-mark" viewBox="0 0 64 64" role="img" aria-hidden="true">
      <circle className="logo-ring" cx="32" cy="32" r="27"/>
      <path className="logo-arch" d="M18 44V29c0-8 6.2-14 14-14s14 6 14 14v15"/>
      <path className="logo-crescent" d="M37.7 18.5a13.2 13.2 0 1 0 0 26.2 14.2 14.2 0 1 1 0-26.2Z"/>
      <path className="logo-monogram" d="m23 42 8.8-21 9.2 21m-14-8h9.8"/>
    </svg>
    <span className="amanah-logo-wordmark"><b>AMANAH</b>{showTagline && <small>GIVING</small>}</span>
  </span>;
}
