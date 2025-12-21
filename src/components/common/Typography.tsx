import clsx from "clsx";
import { ReactNode } from "react";

export const Title = ({ children, className = "pb-16" }: { children: ReactNode; className?: string }) => (
  <p className={clsx("font-bold text-[40px] text-brand-purple-darker", className)}>{children}</p>
);

export const Paragraph = ({ className, children }: { className?: string; children: ReactNode }) => (
  <p className={clsx(className)}>{children}</p>
);
export const Subtitle = ({ className, children }: { className?: string; children: ReactNode }) => (
  <p className={clsx("text-md font-bold  pb-4 text-rand-purple-darker", className)}>{children}</p>
);

export const Bullets = ({ className, bullets }: { className?: string; bullets: ReactNode[] }) => (
  <ul className="list-disc list-inside pt-8 pl-8">
    {bullets.map((content, index) => (
      <li key={index} className={clsx("", className)}>
        {content}
      </li>
    ))}
  </ul>
);

export const JobType = ({ children }: { children: ReactNode }) => (
  <p className="text-gray-500 text-[20px] font-medium tracking-wide">{children}</p>
);

export const jobs = [
  { title: "Senior Backend Engineer", id: "f7de87f0-9e32-4b14-bdd5-ccbed2e0d9f6" },
  { title: "Machine Learning Engineer", id: "a60f8e45-3655-4eb7-adb8-9afc275ff775" },
];

export const TypographyContainer = ({ children }: { children: ReactNode }) => (
  <div className="relative z-0 flex justify-center w-full lg:block">
    <section
      className="text-left px-8 lg:mx-auto max-w-prose py-20 lg:pb-48 text-brand-purple-darker">{children}</section>
  </div>
);
