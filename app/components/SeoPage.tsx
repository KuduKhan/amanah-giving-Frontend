import Link from 'next/link';
import AmanahLogo from '../AmanahLogo';
import Icon from '../Icon';

export type SeoSection = { heading: string; body: string; links?: { href: string; label: string }[] };
export default function SeoPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: SeoSection[] }) {
  return <main className="seo-page"><header className="seo-header"><Link href="/" aria-label="Amanah Giving home"><AmanahLogo /></Link><Link className="text-link" href="/">Back to Amanah <Icon name="arrow-left" /></Link></header><article className="seo-content"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="seo-intro">{intro}</p><div className="seo-sections">{sections.map((section) => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p>{section.links && <nav className="seo-links" aria-label={`${section.heading} links`}>{section.links.map((link) => <Link key={link.href} href={link.href}>{link.label} <Icon name="arrow-right" /></Link>)}</nav>}</section>)}</div></article><footer className="seo-footer"><span>© 2026 Amanah Giving · Kenya</span><span>English · Kiswahili</span></footer></main>;
}
