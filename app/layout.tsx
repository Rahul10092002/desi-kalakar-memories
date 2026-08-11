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
  title: "The Bluetooth Era",
  description:
    "A nostalgic music memory experience inspired by early 2010s India, Bluetooth transfers, MP3 nights, and neon-lit college rides.",
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
