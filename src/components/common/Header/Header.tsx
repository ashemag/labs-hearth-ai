"use client";
import clsx from "clsx";
import { useCycle } from "framer-motion";
import Link from "next/link";
import DesktopNavigation from "./DesktopNav";
import MobileNavigation from "./MobileNav";

const Header = () => {
  const [open, cycleOpen] = useCycle(false, true);

  return (
    <header
      className={clsx(
        "py-1 fixed flex items-center justify-between w-full px-[6vw] border-b-2 border-opacity-40 border-brand-orange-lightest",
        "text-sm bg-brand-orange-lightest bg-opacity-10 backdrop-blur-lg transition-colors duration-300 z-10",
        { "bg-white": open }
      )}
    >
      <div className="hover:opacity-60">
        <Link href="/" onClick={() => open && cycleOpen()} className="flex shrink-0">
          <img src="/brand/hearth_logo.svg" draggable={false} className="h-[40px] w-[40px] p-1" alt="hearth logo" />
        </Link>
      </div>
      <div className="hidden cursor-pointer md:block ml-auto">
        <DesktopNavigation />
      </div>
      <div className="block md:hidden">
        {/* <MobileNavigation open={open} cycleOpen={cycleOpen} /> */}
      </div>
    </header>
  );
};

Header.displayName = "Header";
export default Header;
