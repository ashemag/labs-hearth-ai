import clsx from "clsx";
import { motion } from "framer-motion";
import Image from "next/image";
import searchLogo from "public/brand/search_logo.svg";
import React, { useEffect, useState } from "react";

interface AutoTypingComponentProps {
  placeholderTexts: string[];
  typingSpeed?: number; // milliseconds per character
  onComplete: () => void;
}

const AutoTypingComponent: React.FC<AutoTypingComponentProps> = ({ placeholderTexts, typingSpeed, onComplete }) => {
  const [text, setText] = useState("");
  const [charIndex, setCharIndex] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  const [isTypingComplete, setIsTypingComplete] = useState(false);
  const [changeStyle, setChangeStyle] = useState(false);
  const isLastText = textIndex === placeholderTexts.length - 1;

  useEffect(() => {
    const currentText = placeholderTexts[textIndex];

    if (charIndex < currentText.length) {
      const timeoutId = setTimeout(() => {
        setText(currentText.slice(0, charIndex + 1));
        setCharIndex(charIndex + 1);
      }, typingSpeed);
      return () => clearTimeout(timeoutId);
    } else if (textIndex < placeholderTexts.length - 1) {
      setTimeout(() => {
        setIsTypingComplete(false);
        setCharIndex(0);
        setTextIndex(textIndex + 1);
      }, 1000);
    } else if (!isTypingComplete) {
      setIsTypingComplete(true);
      if (isLastText) {
        setTimeout(() => setChangeStyle(true), 500); // Delay for style change
      }
      // Delay before calling onComplete
      const completionDelay = 1500; // Adjust this value as needed
      setTimeout(onComplete, completionDelay);
    }
  }, [charIndex, placeholderTexts, typingSpeed, isTypingComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="mt-20 pointer-events-none w-full px-4 sm:px-32 lg:pl-[35vw] lg:pr-[34vw]"
    >
      <motion.div className="relative h-[200px] ">
        <Image
          src={searchLogo}
          alt="brand_logo_search"
          className="pointer-events-none absolute inset-y-0 left-0 h-7 w-7 mt-[2px] lg:h-9 lg:w-9 pl-2 lg:pl-3.5"
        />
        <input
          type="text"
          id="user_query_input"
          placeholder={text}
          readOnly
          className={clsx(
            "pointer-events-none w-full rounded border pl-8 lg:pl-12 pr-2.5 lg:pr-4 py-2 text-xs lg:text-sm",
            { "placeholder:text-brand-purple-dark border-brand-purple-dark": isLastText && changeStyle },
            { " border-brand-purple-light": !isLastText && !changeStyle }
          )}
        />
      </motion.div>
    </motion.div>
  );
};

export default AutoTypingComponent;
