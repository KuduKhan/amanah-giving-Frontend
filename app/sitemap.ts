import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://amanahgiving.vercel.app';
  const pages = ['', '/about', '/how-it-works', '/zakat', '/sadaqah', '/verified-charities', '/faq', '/contact', '/policies'];
  return pages.map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path === '' ? 'weekly' : 'monthly', priority: path === '' ? 1 : 0.7 }));
}
