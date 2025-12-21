'use client';

import { motion } from "framer-motion";
import HearthLogo from "@/components/HearthLogo";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="relative flex items-center justify-center w-28 h-28">
        <HearthLogo className="w-10 h-10" strokeColor="#8385a6" fillColor="#A7715F" />
        <motion.div
          className="absolute inset-0 rounded-full"
          initial={{ scale: 1, opacity: 1 }}
          animate={{ scale: 1.25, opacity: 0 }}
          transition={{ duration: 0.75, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
          style={{ border: '2px solid #f25700' }}
        />
      </div>
    </div>
  );
}
