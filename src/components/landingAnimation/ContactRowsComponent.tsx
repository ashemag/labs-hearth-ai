import { motion } from "framer-motion";
import React, { useEffect } from "react";
import Image from "next/image";
import first_row from "/public/product/first_row.svg";
import second_row from "/public/product/second_row.svg";
import third_row from "/public/product/third_row.svg";

interface ContactRowsComponentProps {
  onComplete: () => void;
}

const ContactRowsComponent: React.FC<ContactRowsComponentProps> = ({ onComplete }) => {
  const images = [first_row, second_row, third_row];
  const variants = {
    hidden: { y: -50, opacity: 0 },
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: (2 - i) * 0.5, // Staggered delay
        type: "spring",
        stiffness: 60,
        damping: 20,
      },
    }),
  };

  useEffect(() => {
    //the last animation (first div in the array) takes the longest
    const totalAnimationTime = images.length * 0.5 * 1000 + 1500;
    const timeoutId = setTimeout(onComplete, totalAnimationTime);

    return () => clearTimeout(timeoutId);
  }, [onComplete]);

  return (
    <motion.div
      className="flex flex-col items-left justify-center space-y-6 pl-3 lg:pl-[25vw] lg:pr-[20vw] mt-16"
      initial={{ opacity: 0 }} // Initial state for fade-in
      animate={{ opacity: 1 }} // Animate to visible
      exit={{
        opacity: 0,
        transition: {
          opacity: { duration: 0.8 },
        },
      }} // Exit state for fade-out
      transition={{ duration: 1 }}
    >
      {images.map((image, index) => (
        <motion.div
          key={index}
          custom={index} // Pass the index as custom prop to control the delay
          initial="hidden"
          animate="visible"
          variants={variants}
          transition={{ duration: 1 }}
          className="rounded-lg"
        >
          <Image src={image} alt={`Div ${index + 1}`} className="w-full" />
        </motion.div>
      ))}
    </motion.div>
  );
};

export default ContactRowsComponent;
