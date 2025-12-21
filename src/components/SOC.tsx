// SOC.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import soc2Logo from "public/soc2.webp";

export default function SOC() {
  return (
    <div className="flex flex-col items-end pr-4 pb-4 w-full">
      <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md border border-gray-200 rounded-full px-4 py-2 shadow-sm transition hover:shadow-md">
        <Link
          href="https://app.vanta.com/hearthai/trust/mqnjxgvcyj2ggxevm1gmd2"
          target="_blank"
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          title="SOC 2"
        >
          <Image src={soc2Logo} alt="SOC 2" width={40} height={40} className="object-contain" />
          <span className="text-sm font-medium text-gray-700">
            Your data, <br />
            secure.
          </span>
        </Link>
      </div>
    </div>
  );
}
