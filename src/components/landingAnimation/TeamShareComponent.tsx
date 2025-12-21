import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface Teammate {
  name: string;
  email: string;
  photoUrl: string;
}

interface AutoShareProps {
  teammates: Teammate[];
  typingSpeed?: number; // milliseconds per character
  onComplete: () => void;
}

const TeamShareComponent: React.FC<AutoShareProps> = ({ teammates, typingSpeed = 100, onComplete }) => {
  const [inputValue, setInputValue] = useState("");
  const [filteredTeammates, setFilteredTeammates] = useState<Teammate[]>([]);
  const [typingIndex, setTypingIndex] = useState(0);
  const typingText = "Olivia"; // Example name to auto-type
  const [mimicOnClick, setMimicOnClick] = useState(false);
  useEffect(() => {
    if (typingIndex < typingText.length) {
      const timer = setTimeout(() => {
        const nextChar = typingText.charAt(typingIndex);
        const newValue = inputValue + nextChar;
        setInputValue(newValue);
        setFilteredTeammates(
          teammates.filter((teammate) => teammate.name.toLowerCase().startsWith(newValue.toLowerCase()))
        );
        setTypingIndex(typingIndex + 1);
      }, typingSpeed);

      return () => clearTimeout(timer);
    } else {
      const postTypingDelay = 700; // 1 second delay after typing is done
      const flashDuration = 200; // duration of the flash effect
      const onCompleteDelay = 500; // 1 second delay after flash effect

      const postTypingTimeout = setTimeout(() => {
        setMimicOnClick(true); // activate flash
        const flashTimeout = setTimeout(() => {
          setMimicOnClick(false); // deactivate flash

          // Call onComplete after additional delay
          const onCompleteTimeout = setTimeout(onComplete, onCompleteDelay);

          return () => clearTimeout(onCompleteTimeout);
        }, flashDuration);

        return () => clearTimeout(flashTimeout);
      }, postTypingDelay);

      return () => clearTimeout(postTypingTimeout);
    }
  }, [typingIndex, typingText, typingSpeed, teammates, inputValue]);

  return (
    <motion.div
      className="flex items-start justify-center w-full px-4 lg:ml-2 mt-16 lg:px-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="relative w-full max-w-md rounded-lg bg-white">
        <div className="mb-4 flex flex-col items-start gap-4">
          <div className="flex items-center gap-2">
            <p className="text-sm text-brand-purple-darker">Selected group:</p>

            <p className="text-sm font-semibold text-brand-purple-darker">Female AI Leaders in SF and NY</p>
          </div>
        </div>
        <div className="flex flex-col items-start">
          <p className="mb-2 text-sm font-semibold text-brand-purple-darker">Share with:</p>
          <input
            type="text"
            value={inputValue}
            className="pointer-events-none w-full rounded-md border border-brand-purple-light px-4 py-2 text-sm text-brand-purple-darker focus:border-brand-purple-light focus:outline-none focus:ring-0"
            readOnly
          />
        </div>
        <AnimatePresence>
          {filteredTeammates.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 1 }}
              className={clsx("absolute z-10 mt-1 w-full rounded-md border border-brand-purple-light shadow-lg", {
                "bg-brand-purple-light": mimicOnClick,
              })}
            >
              {filteredTeammates.map((teammate, index) => {
                return (
                  <div
                    key={index}
                    className={clsx(
                      "pointer-events-none flex items-center px-4 py-2 text-sm text-brand-purple-darker hover:bg-gray-100"
                    )}
                  >
                    <img className="mr-2 h-10 w-10 rounded-full" src={teammate.photoUrl} />

                    <div className="flex flex-col items-start">
                      <p>{teammate.name}</p>
                      <p>{teammate.email}</p>
                    </div>
                    <button className="ml-auto rounded border border-brand-orange px-1 py-[1px] text-sm text-brand-orange">
                      Share
                    </button>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default TeamShareComponent;
