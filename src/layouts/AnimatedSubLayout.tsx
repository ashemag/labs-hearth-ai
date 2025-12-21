"use client";
import { TypographyContainer } from "@/components/common/Typography";
import { AnimatePresence, motion } from "framer-motion";
import { ReactNode } from "react";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

const AnimatedTypographyContainer = motion(TypographyContainer);

export const AnimatedSubLayout = ({ children }: { children: ReactNode }) => (
  <AnimatePresence>
    <AnimatedTypographyContainer initial="hidden" animate="show" variants={containerVariants}>
      {children}
    </AnimatedTypographyContainer>
  </AnimatePresence>
);
