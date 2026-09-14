import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://amanahgiving.vercel.app'),
  title: 'Amanah Giving | Verified Islamic Charity',
  description: 'Amanah Giving is a verified Islamic charity platform for secure Zakat and Sadaqah giving in Kenya, with clear records from donation to delivery.',
  keywords: ['Islamic charity', 'verified Muslim charity', 'Zakat donation online', 'Sadaqah donation platform', 'Amanah charity Kenya', 'Islamic giving platform'],
  authors: [{ name: 'Amanah Giving' }],
  creator: 'Amanah Giving',
  publisher: 'Amanah Giving',
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
  openGraph: {
    title: 'Amanah Giving',
    description: 'Give with Amanah. See the Impact.',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'Amanah Giving - Give with Amanah. See the Impact.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Amanah Giving',
    description: 'Give with Amanah. See the Impact.',
    images: ['/og.png'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Amanah Giving',
  url: 'https://amanahgiving.vercel.app',
  logo: 'https://amanahgiving.vercel.app/amanah-logo.png',
  description: 'Verified Islamic charity platform for secure Zakat and Sadaqah donations in Kenya.',
  areaServed: 'Kenya',
  sameAs: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        {children}
      </body>
    </html>
  );
}
