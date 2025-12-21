"use client";
import { NavItems } from "@/types";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItemsDesktop: NavItems[] = [
  // { name: "Early Access", to: "/early-access", id: 0 },
  // { name: "Blog", to: "/blog", id: 3 },
];

const DesktopNavigation = () => {
  const navigationLinks = navItemsDesktop;
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-center w-full h-full pt-1 space-x-6">
      <nav>
        <ul className="flex items-center space-x-2 font-thin">
          {navigationLinks.map(({ name, to, id }) => (
            <li key={name}>
              <Link
                className={clsx(
                  "py-2 px-6 hover:text-brand-orange font-semibold",
                  pathname === to ? "text-brand-orange" : "text-brand-orange/60"
                )}
                href={to}
              >
                {name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default DesktopNavigation;
