// G analytics - https://analytics.google.com/analytics/web/#/

import { Inter } from "next/font/google";

import GoogleAnalytics from "@/components/GoogleAnalytics";
import Footer from "@/components/common/Footer";
import { AnimationControlProvider } from "@/context/animationControlContext";
import clsx from "clsx";
import { ReactNode } from "react";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: "variable",
  variable: "--font-inter",
});

export const metadata = {
  metadataBase: new URL("https://labs.hearth.ai"),
  title: {
    default: "Hearth AI — Relational Intelligence",
    template: "%s | Hearth AI",
  },
  description: "Your Second Brain for Your People. Hearth AI is relational intelligence software that helps you nurture meaningful connections, remember what matters, and build stronger relationships.",
  keywords: [
    "relational intelligence",
    "second brain",
    "relationship management",
    "personal CRM",
    "contact management",
    "networking tool",
    "relationship tracking",
    "people management",
    "connection builder",
    "AI assistant",
  ],
  authors: [{ name: "Hearth AI" }],
  creator: "Hearth AI",
  publisher: "Hearth AI",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://labs.hearth.ai",
    siteName: "Hearth AI",
    title: "Hearth AI — Relational Intelligence",
    description: "Your Second Brain for Your People. Build stronger relationships with AI-powered relational intelligence.",
    images: [
      {
        url: "/brand/opengraph-image.svg",
        width: 1200,
        height: 630,
        alt: "Hearth AI - Relational Intelligence",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hearth AI — Relational Intelligence",
    description: "Your Second Brain for Your People. Build stronger relationships with AI-powered relational intelligence.",
    images: ["/brand/opengraph-image.svg"],
    creator: "@HearthAI",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  icons: {
    icon: "/brand/logo_square_new.png",
    shortcut: "/brand/logo_square_new.png",
    apple: "/brand/logo_square_new.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "https://labs.hearth.ai",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable}`}>
      <GoogleAnalytics GA_TRACKING_ID={process.env.NEXT_PUBLIC_GA_ID as string} />
      <body className={clsx("text-brand-purple-darker ")}>
        <AnimationControlProvider>
          <div className="min-h-screen grid grid-rows-layout">
            <main>{children}</main>
          </div>
        </AnimationControlProvider>
      </body>
    </html>
  );
}
