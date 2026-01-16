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
  title: "Hearth Labs",
  description: "Relational Intelligence",
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
