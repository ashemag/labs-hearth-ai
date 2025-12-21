import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import WavyQuoteBox from "./WavyQuoteBox";

const quotes = [
  {
    quote:
      "Blending my personal and professional connections has always been a challenge, and no tool has ever come close to solving it—until now. I’m excited to finally have a home for this.",
    attributionText: "Mattingly Messina, Founder, Throughline",
    attribution: (
      <>
        <span className="text-brand-orange">Mattingly Messina</span>
        <br /> Founder, Throughline
      </>
    ),
    photo: "/testimonials/mattingly.jpeg",
  },
  {
    quote:
      "Hearth feels like chatting with a friend, not just messaging an AI tool. It empowers me to make the most of my network in a way that feels natural and engaging.",
    // "The Hearth agent is bright, friendly and I actually feel excited to talk to it like a human. With ChatGPT or Gemini it's like a command prompt: the interaction is impersonal, I just get what I need with it. When I chat with the Hearth bot, I feel empowered to make the most of my network, which is super important to me. Hearth offers a fresh new approach to how I look at and handle my network.",
    attributionText: "Madisen Taylor, Ops, HuggingFace",
    attribution: (
      <>
        <span className="text-brand-orange">Madisen Taylor</span>
        <br />
        Ops, HuggingFace
      </>
    ),
    photo: "/testimonials/madisen.jpeg",
  },
  {
    quote:
      "This isn’t just a CRM—it’s not about people as data points, it’s about the genuine connections behind deals and partnerships. It’s been a game-changer to have all my contacts in one place with smart news collection and organization.",
    attributionText: "Mickey Friedman, Co-Founder, Flair.ai",
    attribution: (
      <>
        <span className="text-brand-orange">Mickey Friedman</span>
        <br />
        Co-Founder, Flair.ai
      </>
    ),
    photo: "/testimonials/mickey.jpeg",
  },
];

const TestimonialsSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    // Getting scientific here, 4 words per second is avg reading speed
    const readingTime = (quotes[currentIndex].quote.split(" ").length / 4) * 1000;
    const timer = setInterval(() => {
      handleNext();
    }, readingTime);
    return () => clearInterval(timer);
  }, [currentIndex]);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % quotes.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + quotes.length) % quotes.length);
  };

  const slideVariants = {
    center: {
      x: 0,
      scale: 1,
      opacity: 1,
      filter: "blur(0px)",
      zIndex: 3,
      transition: {
        duration: 1.2,
        ease: [0.2, 0.65, 0.45, 0.95],
      },
    },
    left: {
      x: -300,
      scale: 0.85,
      opacity: 0.5,
      filter: "blur(4px)",
      zIndex: 1,
      transition: {
        duration: 1.2,
        ease: [0.2, 0.65, 0.45, 0.95],
      },
    },
    right: {
      x: 300,
      scale: 0.85,
      opacity: 0.5,
      filter: "blur(4px)",
      zIndex: 1,
      transition: {
        duration: 1.2,
        ease: [0.2, 0.65, 0.45, 0.95],
      },
    },
    enter: (direction: number) => ({
      x: direction > 0 ? 600 : -600,
      scale: 0.85,
      opacity: 0,
      filter: "blur(4px)",
      zIndex: 0,
    }),
    exit: (direction: number) => ({
      x: direction > 0 ? -600 : 600,
      scale: 0.85,
      opacity: 0,
      filter: "blur(4px)",
      zIndex: 0,
      transition: {
        duration: 1.2,
        ease: [0.2, 0.65, 0.45, 0.95],
      },
    }),
  };

  return (
    <div className="flex flex-col items-center justify-center mb-32">
      <h3 className="text-center text-2xl font-bold mt-6">What our customers are saying</h3>

      <div className="relative w-full max-w-[1200px] h-[300px] mx-auto overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="popLayout" custom={direction}>
            {[-1, 0, 1].map((offset) => {
              const index = wrap(0, quotes.length, currentIndex + offset);
              return (
                <motion.div
                  key={index}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate={offset === 0 ? "center" : offset === -1 ? "left" : "right"}
                  exit="exit"
                  className="absolute w-[400px]"
                  style={{
                    perspective: "1000px",
                  }}
                >
                  <WavyQuoteBox>
                    <p className="text-[#34364b] font-semibold">{quotes[index].quote}</p>
                    {offset === 0 && (
                      <motion.div
                        className="flex items-center gap-4 justify-center relative mt-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                      >
                        <Image
                          src={quotes[index].photo}
                          alt={quotes[index].attributionText}
                          className="rounded-full"
                          width={36}
                          height={36}
                        />
                        <p className="text-sm relative">{quotes[index].attribution}</p>
                      </motion.div>
                    )}
                  </WavyQuoteBox>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <button
          onClick={handlePrev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10"
          aria-label="Previous testimonial"
        >
          {/* ... arrow SVG ... */}
        </button>

        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10"
          aria-label="Next testimonial"
        >
          {/* ... arrow SVG ... */}
        </button>

        {/* Navigation dots */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex gap-3">
          {quotes.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentIndex ? 1 : -1);
                setCurrentIndex(idx);
              }}
              className="group"
              aria-label={`Go to testimonial ${idx + 1}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <motion.circle
                  cx="6"
                  cy="6"
                  r="3"
                  stroke={idx === currentIndex ? "#a7715f" : "#EAEAED"}
                  strokeWidth="1"
                  fill={idx === currentIndex ? "#a7715f" : "none"}
                  initial={false}
                  animate={{
                    scale: idx === currentIndex ? 1.2 : 1,
                  }}
                  className="origin-center"
                />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Helper function to wrap around the array indices
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export default TestimonialsSection;
