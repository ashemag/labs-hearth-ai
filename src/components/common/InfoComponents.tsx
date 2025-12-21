"use client";

import { ArticleData } from "@/types";
import clsx from "clsx";
import { ReactNode } from "react";

export const InfoTitle = ({ children, id }: { children: string | ReactNode; id?: string }) => (
  <p className="text-[24px] text-[#4b4b5e] font-medium" id={id}>
    {children}
  </p>
);

export const InfoSubTitle = ({ children, id }: { children: string; id?: string }) => (
  <p className="text-[20px] text-[#4b4b5e] font-medium" id={id}>
    {children}
  </p>
);

export const Spacer = () => <div className="h-12" />;
export const SmallSpacer = () => <div className="h-6" />;
export const TitleSpacer = () => <div className="h-2" />;

export const Text = ({ children }: { children: ReactNode }) => <p className="leading-6">{children}</p>;

export const Image = ({ src }: { src: string }) => (
  <div className="flex justify-center py-8">
    <img className="md:h-64" src={src} />
  </div>
);

export const Bullets = ({ list }: { list: string[] }) => (
  <div className="flex flex-col py-8 items-center justify-center leading-7">
    <div className="px-[16vw] md:px-[12vw]">
      <ul className="list-disc list-outside">
        {list.map((item: string, index: number) => (
          <li key={index} className="">
            {item}
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export const InfoLink = ({ href, children }: { href: string; children: ReactNode }) => (
  <a className="underline text-brand-orange" href={href}>
    {children}
  </a>
);

export const Template = ({ children, articleData }: { children: ReactNode; articleData: ArticleData }) => {
  const Title = () => (
    <div className="flex items-center">
      <img src={articleData.icon} alt="arvatar_icon" className={"h-8 pr-2"} />
      <h1 className="text-[30px] lg:text-[40px] font-semibold m-[10px] text-[#4b4b5e] leading-18 md:leading-24">
        {articleData.title}
      </h1>
    </div>
  );

  const Subtitle = () => (
    <div className="flex tracking-wide text-brand-purple-darker  flex-col md:flex-row">
      <p>{articleData.createDate}</p>
      <span className="pl-2 pr-2 hidden md:block">•</span>
      <p>{articleData.author}</p>
    </div>
  );

  return (
    <main className={clsx("flex flex-col justify-center px-[6vw] md:px-[24vw] pb-[24vh] pt-[6vh] md:pt-[2vh]")}>
      <div className="min-h-screen text-brand-purple-darker">
        <Title />
        <Subtitle />
        <Spacer />
        {children}
      </div>
    </main>
  );
};
