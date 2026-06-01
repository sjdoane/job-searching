import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { profile, siteUrl } from "@/content/profile";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const description =
  "Samuel Doane — USC Mechanical Engineering (B.S.) and M.S. in AI/ML. A multidisciplinary engineer-builder across mechanical design, robotics, AI/ML, and quantitative finance.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Samuel Doane — Engineer-Builder",
    template: "%s · Samuel Doane",
  },
  description,
  applicationName: "Samuel Doane — Portfolio",
  authors: [{ name: profile.name }],
  creator: profile.name,
  keywords: [
    "Samuel Doane",
    "mechanical engineer",
    "robotics",
    "machine learning",
    "reinforcement learning",
    "quantitative finance",
    "product",
    "USC",
    "portfolio",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "Samuel Doane",
    title: "Samuel Doane — Engineer-Builder",
    description,
  },
  twitter: {
    card: "summary_large_image",
    title: "Samuel Doane — Engineer-Builder",
    description,
  },
  alternates: {
    canonical: siteUrl,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0b",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="bg-bg text-ink antialiased">
        <noscript>
          <style
            dangerouslySetInnerHTML={{
              __html: ".reveal{opacity:1 !important;transform:none !important}",
            }}
          />
        </noscript>
        {children}
      </body>
    </html>
  );
}
