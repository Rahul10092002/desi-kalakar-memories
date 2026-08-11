import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DESI KALAKAAR MEMORIES",
  description:
    "The songs we passed around. The era we never forgot. Yo Yo Honey Singh Bluetooth nostalgia.",
  openGraph: {
    title: "DESI KALAKAAR MEMORIES",
    description: "The songs we passed around. The era we never forgot. Yo Yo Honey Singh Bluetooth nostalgia.",
    url: "https://desi-kalakar-memories.vercel.app/",
    siteName: "DESI KALAKAAR MEMORIES",
    images: [
      {
        url: "https://desi-kalakar-memories.vercel.app/og-image.png",
        width: 1200,
        height: 630,
        alt: "Desi Kalakaar Memories Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "DESI KALAKAAR MEMORIES",
    description: "The songs we passed around. The era we never forgot. Yo Yo Honey Singh Bluetooth nostalgia.",
    images: ["https://desi-kalakar-memories.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#070406] text-[#f7f3eb]`}
    >
      <body className="min-h-full bg-[#070406] text-[#f7f3eb]">{children}</body>
    </html>
  );
}
