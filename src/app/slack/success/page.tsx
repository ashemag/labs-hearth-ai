"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SlackSuccess() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-white">
      <div className="w-full max-w-sm mx-auto px-6">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Image 
            src="/brand/logo_square_new.png" 
            alt="Hearth" 
            width={36} 
            height={36}
          />
        </div>

        <div className="text-center">
          <div className="mb-6">
            <h2 className="text-2xl font-medium text-brand-purple-darkest tracking-tight">
              Slack connected
            </h2>
            <p className="mt-3 text-sm text-brand-purple">
              Hearth AI has been added to your workspace.
            </p>
            <p className="mt-1 text-sm text-brand-purple/60">
              You can now use Hearth in Slack.
            </p>
          </div>

          <Link href="/">
            <Button className="w-full h-12 bg-brand-purple-darkest hover:bg-brand-purple-darker text-white font-medium transition-all">
              Go to Hearth
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
