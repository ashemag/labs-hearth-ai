"use client";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect } from "react";

const navItemsMobile = [
  // { name: "Early Access", to: "/early-access", id: 0 },
  // { name: "Blog", to: "/blog", id: 3 },
  // { name: "Security", to: "/security", id: 5 },
  // { name: "Privacy Policy", to: "privacy-policy", id: 6 },
];

const MobileNavigation = ({ open, cycleOpen }: { open: boolean; cycleOpen: () => void }) => {
  useEffect(() => {
    if (open) {
      // Disable scrolling when open is true
      document.body.style.overflow = "hidden";
    } else {
      // Enable scrolling when open is false
      document.body.style.overflow = "visible";
    }

    // Cleanup - Set the style back to default when the component is unmounted
    return () => {
      document.body.style.overflow = "visible";
    };
  }, [open]);
  return (
    <div className="">
      <Bars3Icon className="w-6 h-6 text-brand-orange cursor-pointer hover:text-brand-orange/80" onClick={cycleOpen} />

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: "3%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "3%" }}
            transition={{ duration: 0.2, delay: 0.05 }}
            className="absolute z-40 left-0 top-full h-screen w-screen bg-white"
          >
            <ul className="flex flex-col items-start w-full h-full p-[4vw]"> 
            </ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MobileNavigation;
