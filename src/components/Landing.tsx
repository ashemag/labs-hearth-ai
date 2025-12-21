"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function Landing() {
  return (
    <div className="relative w-screen min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="relative">
        <Image
          src="/brand/hearth_logo.svg"
          alt="Hearth Logo"
          width={40}
          height={35}
          priority
        />
        {/* Larger white background circle to fully cover the original orange dot */}
        <div
          className="absolute w-[14px] h-[14px] rounded-full bg-white"
          style={{
            left: '13px',
            top: '21.5px',
          }}
        />
        {/* White background circle to cover the original orange dot */}
        <div
          className="absolute w-[10px] h-[10px] rounded-full bg-white"
          style={{
            left: '15px',
            top: '23.5px',
          }}
        />
        {/* Pulsing orange dot on top */}
        <motion.div
          className="absolute w-[10px] h-[10px] rounded-full bg-[#A7715F]"
          style={{
            left: '15px',
            top: '23.5px',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </div>
  );
}

