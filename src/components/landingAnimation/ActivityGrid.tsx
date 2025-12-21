import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useMemo, useState } from "react";

// Configuration
const WEEKS = 52;
const DAYS = 7; // Sunday(0) through Saturday(6)
const START_DATE = new Date(new Date().getFullYear(), 0, 1); // Jan 1 of current year

// Extended color scale from light to dark orange
const colorScale = [
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

// Label only Mon(1), Wed(3), Fri(5)
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

// Pseudo-random function to generate a stable "random" offset based on column and row
function pseudoRandomSeed(w: number, d: number): number {
  const seed = w * 1000 + d; // combine w and d to get a seed
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const getCellColor = (w: number, d: number): string => {
  const dayIndex = w * DAYS + d; // day number from 0 to 363
  const progress = dayIndex / (200 - 1);

  const baseIndex = Math.floor(progress * (colorScale.length - 1));

  // Generate a small variation in color index (-1, 0, or +1)
  const rand = pseudoRandomSeed(w, d);
  const variation = Math.floor(rand * 3) - 1;

  const variedIndex = Math.min(Math.max(baseIndex + variation, 0), colorScale.length - 1);
  return colorScale[variedIndex];
};

// Parent and child variants for staggered animation
const parentVariants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.005,
    },
  },
};

const cellVariants = {
  initial: { backgroundColor: initialColor },
  animate: (cellColor: string) => ({
    backgroundColor: cellColor,
    transition: { duration: 0.1, ease: "easeOut" },
  }),
};

const ActivityGrid = () => {
  const [showText, setShowText] = useState(false);

  // Month labels
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

  // After all cells animate, show text after a short delay
  const handleAllCellsDone = () => {
    setTimeout(() => setShowText(true), 200);
  };

  // Motion value for the overlay's x position
  const overlayX = useMotionValue(-300); // starting from -300% (off-screen to the left)

  // Interpolated text color based on overlay's x position
  const textColor = useTransform(
    overlayX,
    [-300, 0, 300], // input range: from -300% to 300%
    ["#9ca3af", "#9ca3af", "#a7715f"] // output range: stays gray until overlay reaches 0%, then transitions to orange
  );

  return (
    <div className="flex flex-col items-center p-6">
      {/* Month Labels Row */}
      <div className="flex mb-2 relative">
        <div className="ml-8 grid" style={{ gridTemplateColumns: `repeat(${WEEKS}, 1fr)` }}>
          {Array.from({ length: WEEKS }).map((_, w) => (
            <div key={w} className="relative h-4 flex items-end justify-center text-xs text-gray-500 font-medium">
              {monthLabels[w] && monthLabels[w]}
            </div>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Day Labels */}
        <div className="flex flex-col items-end mr-2 text-sm font-medium text-gray-600">
          {Array.from({ length: DAYS }).map((_, d) => (
            <div key={d} style={{ height: 16, marginBottom: 4 }}>
              {dayIndexToLabel(d)}
            </div>
          ))}
        </div>

        {/* Grid */}
        <motion.div
          className="grid"
          style={{
            display: "grid",
            gap: "4px",
            gridAutoFlow: "column",
            gridAutoColumns: "16px",
            gridTemplateRows: `repeat(${DAYS}, 16px)`,
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
                  className="rounded-full"
                  custom={cellColor}
                  variants={cellVariants}
                  style={{ width: 16, height: 16 }}
                />
              );
            })
          )}
        </motion.div>
      </div>

      {/* Reserve space for text to avoid layout shift */}
      <div
        style={{
          height: "50px",
          display: "flex",
          alignItems: "center",
          marginTop: "20px",
        }}
      >
        <AnimatePresence>
          {showText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8 }}
              className="relative font-semibold text-xl"
              style={{
                position: "relative",
                overflow: "hidden",
                width: "fit-content",
              }}
            >
              {/* Bind text color to interpolated value */}
              <motion.span style={{ color: textColor }}>
                <div className="flex flex-col">
                  <span>Not for your leads, for your humans.</span>
                </div>
              </motion.span>
              {/* Flash overlay */}
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
                initial={{ x: -300 }} // start from -300%
                animate={{ x: 300 }} // move to 300%
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
};

export default ActivityGrid;
