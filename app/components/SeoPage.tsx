import type { ReactNode } from 'react';
import Link from 'next/link';
import AmanahLogo from '../AmanahLogo';
import Icon from '../Icon';
import { BackToPrevious } from './NavigationContinuity';

export type SeoSection = { heading: string; body: string; links?: { href: string; label: string }[] };
export default function SeoPage({ eyebrow, title, intro, sections = [], headerAside, children }: { eyebrow: string; title: string; intro: string; sections?: SeoSection[]; headerAside?: ReactNode; children?: ReactNode }) {
  return (
    <main className="seo-page">
      <header className="seo-header">
        <Link href="/" aria-label="Amanah Giving home"><AmanahLogo /></Link>
        <BackToPrevious />
      </header>
      <article className="seo-content">
        <header className={`seo-hero${headerAside ? ' seo-lead-layout' : ''}`}>
          <div className="seo-lead-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="seo-intro">{intro}</p>
          </div>
          {headerAside}
        </header>
        <div className="seo-sections">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
              {section.links && (
                <nav className="seo-links" aria-label={`${section.heading} links`}>
                  {section.links.map((link) => (
                    <Link key={link.href} href={link.href}>{link.label} <Icon name="arrow-right" /></Link>
                  ))}
                </nav>
              )}
            </section>
          ))}
        </div>
        {children}
      </article>
      <footer className="seo-footer">
        <span>© 2026 Amanah Giving · Kenya</span>
        <span>English · More languages planned</span>
      </footer>
    </main>
  );
}
