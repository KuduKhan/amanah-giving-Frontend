import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Pwa from './components/Pwa';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  manifest: '/manifest.webmanifest',
  icons: { icon: '/amanah-logo.png', apple: '/amanah-logo.png' },
  appleWebApp: { capable: true, title: 'Amanah Giving', statusBarStyle: 'default' },
  title: 'Amanah Giving | Verified Islamic Charity',
  description: 'Give with trust and follow your impact from donation to delivery.',
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
        {children}
        <Pwa/>
      </body>
    </html>
  );
}
