import { CheckCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "framer-motion";
import React, { useEffect, useState } from "react";

interface AutoNotificationComponentProps {
  onComplete: () => void;
}

const AutoNotificationComponent: React.FC<AutoNotificationComponentProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const completionDelay = 2000; // Adjust this delay as needed
    const completionTimer = setTimeout(onComplete, completionDelay);

    return () => {
      clearTimeout(completionTimer);
    };
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: -50 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-20 pointer-events-none max-w-md lg:max-w-lg"
      >
        <div className=" shadow-lg rounded-lg w-full lg:h-[80px] px-4 pt-6 pb-2 lg:p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-6 w-6 text-green-400" aria-hidden="true" />

            <div className="ml-3 flex flex-col items-start pt-0.5">
              <p className="text-xs lg:text-sm font-medium text-gray-900">
                120 contacts added to Female AI Leaders in SF and NY.
              </p>
              <p className="mt-1 text-xs lg:text-sm text-gray-500">
                You and Olivia will be notified on new matches as they’re added.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default AutoNotificationComponent;
