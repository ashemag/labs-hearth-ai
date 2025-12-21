"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const Footer = () => {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  const footerLinks = [
  ];

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer
        className="flex flex-col gap-4 lg:flex-row items-center justify-between px-[6vw] w-full pb-6 pt-6 bg-white"
      >
        <div className="flex flex-col gap-2 lg:flex-row justify-center items-center text-xs text-brand-purple-darker">
          <p className="max-w-[219px] lg:max-w-[500px] text-center lg:text-left pr-4">{`© ${currentYear} Hearth AI`}</p>
          <div className="flex items-center flex-wrap justify-center lg:justify-start lg:flex-nowrap mr-4">
           
          </div>
        </div>

        <div className="flex flex-col items-center gap-3 lg:items-end">
          <div className="flex flex-row items-center justify-center space-x-3">
            <Link
              href="https://www.linkedin.com/company/hearth-ai/"
              target="_blank"
              className="hover:opacity-100 opacity-80 h-6 w-6"
            >
              <img src="/icons/linkedIn.svg" draggable={false} alt="LinkedIn" />
            </Link>
            <Link
              href="https://twitter.com/hearthai_co"
              target="_blank"
              className="opacity-80 hover:opacity-100 h-6 w-6"
            >
              <img src="/icons/twitter.svg" draggable={false} alt="Twitter" />
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
};

Footer.displayName = "Footer";
export default Footer;
