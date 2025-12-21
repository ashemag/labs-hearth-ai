import React, { useEffect, useState } from "react";

import dynamic from "next/dynamic";

const NetworkGraph = dynamic(() => import("./NetworkGraphComponent"), { ssr: false, suspense: true });

const FinalAnimationComponent: React.FC<{ onGraphRendered: () => void }> = ({ onGraphRendered }) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(typeof window !== "undefined");
  }, []);

  useEffect(() => {
    if (isClient) {
      onGraphRendered(); // Notify parent when the graph is about to be rendered
    }
  }, [isClient, onGraphRendered]);

  return (
    <>
      {/*<motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        className="pointer-events-none h-[80px] max-w-md mx-auto flex flex-col items-center justify-center mt-20"
      >
        <p className="text-sm font-semibold text-brand-orange bg-white rounded-md shadow-custom">
          {`…and we’re just warming up 🔥`}
        </p>
      </motion.div>*/}
      {isClient && <NetworkGraph />}
    </>
  );
};

export default FinalAnimationComponent;
