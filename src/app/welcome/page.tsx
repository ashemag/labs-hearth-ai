"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Check, Download, Chrome } from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [macDownloaded, setMacDownloaded] = useState(false);
  const [chromeInstalled, setChromeInstalled] = useState(false);

  const canContinue = macDownloaded || chromeInstalled;

  // Update these URLs when deployed
  const MAC_DOWNLOAD_URL = process.env.NEXT_PUBLIC_MAC_APP_URL || "https://hearth.ai/downloads/Hearth.dmg";
  const CHROME_EXTENSION_URL = process.env.NEXT_PUBLIC_CHROME_EXTENSION_URL || "https://chrome.google.com/webstore/detail/hearth";

  const handleMacDownload = () => {
    window.open(MAC_DOWNLOAD_URL, "_blank");
    setMacDownloaded(true);
  };

  const handleChromeInstall = () => {
    window.open(CHROME_EXTENSION_URL, "_blank");
    setChromeInstalled(true);
  };

  const handleContinue = () => {
    router.push("/app/rolodex");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white py-12">
      <div className="w-full max-w-md mx-auto px-6">
        {/* Logo with pulsing dot */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <Image
              src="/brand/logo_square_new.png"
              alt="Hearth"
              width={40}
              height={40}
              priority
            />
            <div
              className="absolute w-[14px] h-[14px] rounded-full bg-white"
              style={{ left: '13px', top: '22px' }}
            />
            <motion.div
              className="absolute w-[11px] h-[11px] rounded-full bg-brand-orange"
              style={{ left: '14.5px', top: '23.5px' }}
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          </div>
        </div>

        {/* Welcome text */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-medium text-gray-600 mb-2">
            Welcome to Hearth
          </h1>
          <p className="text-sm text-gray-400">
            Get started by installing our apps
          </p>
        </div>

        {/* Download options */}
        <div className="space-y-4 mb-10">
          {/* Mac App */}
          <button
            onClick={handleMacDownload}
            className={`w-full p-4 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-4 ${
              macDownloaded
                ? "border-green-200 bg-green-50/50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              macDownloaded ? "bg-green-100" : "bg-gray-100"
            }`}>
              {macDownloaded ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Download className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${macDownloaded ? "text-green-700" : "text-gray-600"}`}>
                Mac App
              </p>
              <p className="text-xs text-gray-400">
                Sync your iMessages and contacts
              </p>
            </div>
            {macDownloaded && (
              <span className="text-xs text-green-600 font-medium">Downloaded</span>
            )}
          </button>

          {/* Chrome Extension */}
          <button
            onClick={handleChromeInstall}
            className={`w-full p-4 rounded-xl border transition-all cursor-pointer text-left flex items-center gap-4 ${
              chromeInstalled
                ? "border-green-200 bg-green-50/50"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              chromeInstalled ? "bg-green-100" : "bg-gray-100"
            }`}>
              {chromeInstalled ? (
                <Check className="w-5 h-5 text-green-600" />
              ) : (
                <Chrome className="w-5 h-5 text-gray-500" />
              )}
            </div>
            <div className="flex-1">
              <p className={`font-medium ${chromeInstalled ? "text-green-700" : "text-gray-600"}`}>
                Chrome Extension
              </p>
              <p className="text-xs text-gray-400">
                Save contacts from LinkedIn and X
              </p>
            </div>
            {chromeInstalled && (
              <span className="text-xs text-green-600 font-medium">Installed</span>
            )}
          </button>
        </div>

        {/* Continue button */}
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className={`w-full py-3 rounded-lg font-medium transition-all ${
            canContinue
              ? "bg-gray-900 text-white hover:bg-gray-800 cursor-pointer"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          Continue to Hearth
        </button>

        {/* Skip option */}
        <p className="text-center mt-6">
          <button
            onClick={handleContinue}
            className="text-xs text-gray-400 hover:text-gray-500 transition-colors cursor-pointer"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  );
}
