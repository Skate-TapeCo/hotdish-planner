import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL('https://hotdish-planner.vercel.app'),
  title: 'HotDish Planner — Time your Thanksgiving dishes perfectly',
  description:
    'Enter dishes with prep & cook times, set your serve time, and get a perfect start schedule so everything finishes hot together. Pro adds alarms, save/load, and a beautiful printout.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'HotDish Planner',
    description:
      'Plan Thanksgiving like a pro — everything finishes hot at the same time.',
    url: 'https://hotdish-planner.vercel.app',
    siteName: 'HotDish Planner',
    images: ['/og.png'], // leave as-is; we can add this image later
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HotDish Planner',
    description:
      'Plan Thanksgiving like a pro — everything finishes hot at the same time.',
    images: ['/og.png'],
  },
  icons: {
  icon: '/favicon.ico',
  apple: '/apple-touch-icon.png',
  shortcut: '/favicon.ico',
},
};


export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
