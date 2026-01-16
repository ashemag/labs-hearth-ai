"use client";
import clsx from "clsx";
import { useCycle } from "framer-motion";
import Link from "next/link";
import DesktopNavigation from "./DesktopNav";
import MobileNavigation from "./MobileNav";
import LiquidGlassButton from "@/components/ui/LiquidGlassButton";

const Header = () => {
  const [open, cycleOpen] = useCycle(false, true);

  return (
    <header
      className={clsx(
        "py-2 fixed flex items-center justify-between w-full px-[6vw] border-b border-opacity-20 border-gray-200",
        "text-sm bg-white/80 backdrop-blur-xl transition-colors duration-300 z-10",
        { "bg-white": open }
      )}
    >
      <div className="hover:opacity-60">
        <Link href="/" onClick={() => open && cycleOpen()} className="flex shrink-0">
          <img src="/brand/logo_square_new.png" draggable={false} className="h-[40px] w-[40px] p-1" alt="hearth logo" />
        </Link>
      </div>
      <div className="hidden cursor-pointer md:block ml-auto mr-4">
        <DesktopNavigation />
      </div>
      <div className="flex items-center">
        <LiquidGlassButton href="/sign-in">
          Play with Fire
        </LiquidGlassButton>
      </div>
      <div className="block md:hidden">
        {/* <MobileNavigation open={open} cycleOpen={cycleOpen} /> */}
      </div>
    </header>
  );
};

Header.displayName = "Header";
export default Header;
