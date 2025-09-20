import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Head from "next/head";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polyrank", // Updated to show only "Polyrank"
  description: "Real-time Polymarket prediction market leaderboard tracking top traders' performance with live P&L data, trading volume, and win rates.",
  keywords: ["polymarket", "trading", "leaderboard", "prediction markets", "crypto", "defi"],
  authors: [{ name: "Polyrank Team" }],
  openGraph: {
    title: "Polyrank", // Updated to show only "Polyrank"
    description: "Track the top Polymarket traders with real-time P&L data and performance metrics",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <Head>
        <link rel="icon" type="image/png" href="/favicon-96x96.png" sizes="96x96" />
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" /> {/* Ensure this file exists */}
        <link rel="manifest" href="/site.webmanifest" />
      </Head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}