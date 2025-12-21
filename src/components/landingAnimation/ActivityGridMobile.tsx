// ActivityGridMobile.jsx
import { AnimatePresence, motion, useMotionValue, useTransform, Variants } from "framer-motion";
import { useMemo, useState } from "react";

const WEEKS = 52;
const DAYS = 7;
const START_DATE = new Date(new Date().getFullYear(), 0, 1);

const colorScale: string[] = [
  "rgba(167,113,95,0.05)",
  "rgba(167,113,95,0.1)",
  "rgba(167,113,95,0.2)",
  "rgba(167,113,95,0.3)",
  "rgba(167,113,95,0.4)",
  "rgba(167,113,95,0.5)",
  "rgba(167,113,95,0.6)",
  "rgba(167,113,95,0.7)",
  "rgba(167,113,95,0.8)",
  "rgba(167,113,95,0.9)",
  "#a7715f",
];

const initialColor = "#eee";

const dayIndexToLabel = (i: number): string => {
  if (i === 1) return "Mon";
  if (i === 3) return "Wed";
  if (i === 5) return "Fri";
  return "";
};

const getDateForColumn = (weekIndex: number): Date => {
  const daysFromStart = weekIndex * 7;
  const date = new Date(START_DATE);
  date.setDate(date.getDate() + daysFromStart);
  return date;
};

function pseudoRandomSeed(w: number, d: number): number {
  const seed = w * 1000 + d;
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const getCellColor = (w: number, d: number): string => {
  const dayIndex = w * DAYS + d;
  const progress = dayIndex / (200 - 1);
  const baseIndex = Math.floor(progress * (colorScale.length - 1));
  const rand = pseudoRandomSeed(w, d);
  const variation = Math.floor(rand * 3) - 1;
  const variedIndex = Math.min(Math.max(baseIndex + variation, 0), colorScale.length - 1);
  return colorScale[variedIndex];
};

const parentVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.005,
    },
  },
};

// Adjusted here: No destructuring the argument, just use `custom`
const cellVariants: Variants = {
  initial: { backgroundColor: initialColor },
  animate: (custom) => ({
    backgroundColor: custom,
    transition: { duration: 0.1, ease: "easeOut" },
  }),
};

export default function ActivityGridMobile() {
  const [showText, setShowText] = useState(false);

  const monthLabels = useMemo(() => {
    const labels: { [key: number]: string } = {};
    let lastMonth: number | null = null;
    for (let w = 0; w < WEEKS; w++) {
      const date = getDateForColumn(w);
      const month = date.getMonth();
      if (month !== lastMonth) {
        labels[w] = date.toLocaleString("default", { month: "short" });
        lastMonth = month;
      }
    }
    return labels;
  }, []);

  const handleAllCellsDone = () => {
    setTimeout(() => setShowText(true), 200);
  };

  const overlayX = useMotionValue(-300);
  const textColor = useTransform(overlayX, [-300, 0, 300], ["#9ca3af", "#9ca3af", "#a7715f"]);

  return (
    <div className="flex flex-col items-center p-4 sm:p-6 w-full">
      {/* Month Labels Row - scrollable */}
      <div className="w-full overflow-x-auto mb-2">
        <div className="relative flex items-center" style={{ minWidth: "fit-content" }}>
          <div
            className="ml-8 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${WEEKS}, minmax(16px, 1fr))`,
            }}
          >
            {Array.from({ length: WEEKS }).map((_, w) => (
              <div
                key={w}
                className="relative h-4 flex items-end justify-center text-[10px] sm:text-xs text-gray-500 font-medium"
              >
                {monthLabels[w] && monthLabels[w]}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto">
        <div className="flex">
          {/* Day Labels */}
          <div className="flex flex-col items-end mr-2 text-[10px] sm:text-xs font-medium text-gray-600">
            {Array.from({ length: DAYS }).map((_, d) => (
              <div
                key={d}
                style={{
                  height: 16,
                  marginBottom: 4,
                  width: "24px",
                  textAlign: "right",
                }}
              >
                {dayIndexToLabel(d)}
              </div>
            ))}
          </div>

          {/* Grid */}
          <motion.div
            className="grid gap-1"
            style={{
              gridAutoFlow: "column",
              gridAutoColumns: "minmax(16px, 1fr)",
              gridTemplateRows: `repeat(${DAYS}, 16px)`,
              minWidth: "fit-content",
              width: "100%",
            }}
            variants={parentVariants}
            initial="initial"
            animate="animate"
            onAnimationComplete={handleAllCellsDone}
          >
            {Array.from({ length: WEEKS }).map((_, columnIndex) =>
              Array.from({ length: DAYS }).map((_, rowIndex) => {
                const cellColor = getCellColor(columnIndex, rowIndex);
                return (
                  <motion.div
                    key={`${columnIndex}-${rowIndex}`}
                    className="rounded-sm"
                    custom={cellColor}
                    variants={cellVariants}
                    style={{ width: 16, height: 16, minWidth: 16 }}
                  />
                );
              })
            )}
          </motion.div>
        </div>
      </div>

      {/* Reserve space for text */}
      <div className="flex items-center mt-4 h-[50px]">
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative font-semibold text-lg sm:text-xl text-center px-2"
              style={{
                position: "relative",
                overflow: "hidden",
                width: "fit-content",
              }}
            >
              <motion.span style={{ color: textColor }}>
                <div className="flex flex-col">
                  <span className="leading-snug text-[#a7715f]">Not for your leads, for your humans.</span>
                </div>
              </motion.span>
              <motion.div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "300%",
                  height: "100%",
                  background: "linear-gradient(90deg, #a7715f 0%, transparent 100%)",
                  mixBlendMode: "overlay",
                }}
                initial={{ x: -300 }}
                animate={{ x: 300 }}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                // @ts-ignore
                style={{ x: overlayX }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
