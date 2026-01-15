"use client";

import { useEffect, useState } from "react";

export default function HeroSection() {
  const [showWaves, setShowWaves] = useState(false);

  useEffect(() => {
    // After a brief delay, show the waves
    const timer = setTimeout(() => {
      setShowWaves(true);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center justify-center px-6 py-8 md:pt-[130px] pb-0 md:pb-8 relative bg-white">
      <div className="relative flex items-center justify-center">
        {/* Waves */}
        <div
          className={`transition-opacity duration-700 ease-out ${
            showWaves ? "opacity-100" : "opacity-0"
          } relative flex items-center justify-center`}
        >
          {showWaves && (
            <>
              {/* Central subtle gradient circle */}
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#a7715f] via-[#b88d76] to-[#e2c4ad] shadow-md" />

              {/* More pronounced concentric rings with higher opacity */}
              <div className="absolute w-52 h-52 rounded-full bg-gradient-radial from-[#a7715f]/40 to-transparent ring-animation" />
              <div className="absolute w-72 h-72 rounded-full bg-gradient-radial from-[#a7715f]/25 to-transparent ring-animation delay-75" />
              <div className="absolute w-96 h-96 rounded-full bg-gradient-radial from-[#a7715f]/15 to-transparent ring-animation delay-150" />
            </>
          )}
        </div>
      </div>

      {/* Text content below, appears after waves show */}
      <div
        className={`flex flex-col justify-center items-center max-w-lg text-center transition-all duration-700 ease-out transform ${
          showWaves ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        } mt-20`}
      >
        <br />
        <h2
          className={`text-[24px] font-bold mb-4 text-[#34364b] transition-opacity duration-1500 ease-in-out delay-1200 ${
            showWaves ? "opacity-100" : "opacity-0"
          }`}
        >
          Your connections, curated
        </h2>
        <p
          className={`text-[#34364b] leading-relaxed transition-opacity duration-1500 ease-in-out delay-1500 text-[18px] ${
            showWaves ? "opacity-100" : "opacity-0"
          }`}
        >
          The self-organizing, adaptive hub
          <br />
          to power <strong>relational intelligence</strong> for a lifetime.
          <br />
          <br />
          Keep it private. <br />
          Or share with teammates.
        </p>
      </div>

      <div className="w-full h-full flex flex-col items-center justify-center my-10 md:mt-20">
        <video
          src="/videos/blooming.mp4"
          autoPlay
          loop
          muted
          controls
          playsInline
          className="w-full h-full object-cover rounded-xl max-w-5xl aspect-video bg-white"
        />
      </div>

      <style jsx>{`
        .bg-gradient-radial {
          background: radial-gradient(circle, var(--tw-gradient-from), var(--tw-gradient-to));
        }

        @keyframes subtlePulse {
          0% {
            transform: scale(0.9);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(0.9);
          }
        }

        .ring-animation {
          animation: subtlePulse 4s ease-in-out infinite;
          opacity: 0.9;
        }

        .ring-animation.delay-75 {
          animation-delay: 0.75s;
        }

        .ring-animation.delay-150 {
          animation-delay: 1.5s;
        }
      `}</style>
      <br />
    </div>
  );
}
