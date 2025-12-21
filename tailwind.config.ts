import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ["var(--font-inter)"],
      },
      colors: {
        ["brand-purple"]: {
          DEFAULT: "#8385a6",
          dark: "#4B4E6C",
          darker: "#34364b",
          darkest: "#1e1f2b",
          light: "#bfc0d1",
          lighter: "#E5E5EC",
        },
        ["brand-orange"]: {
          DEFAULT: "#a7715f",
          dark: "#744f42",
          light: "#c19b8f",
          lighter: "#d3b8af",
          lightest: "#ede2df",
        },
        slack: {
          purple: "#611F69",
        },
      },
      backgroundImage: {
        onboarding: "url('/backgrounds/onboarding.png')",
        noiseOverlay: "url('/backgrounds/noiseOverlay.png)",
      },
      animation: {
        "slide-up": "slide-up 0.4s ease-in-out forwards",
        "fade-in-down": "fade-in-down 0.1s ease-out",
      },
      boxShadow: {
        custom: "0 0 5px 10px #fff",
        "custom-sm": "0 0 5px 5px #fff",
      },
      maxWidth: {
        prose: "70ch",
      },
      gridTemplateRows: {
        layout: "min-content 1fr min-content",
      },
    },
    textShadow: {
      bold: "0 0 0px var(--tw-shadow-color)",
    },
  },
  plugins: [
    plugin(function ({ matchUtilities, theme }) {
      matchUtilities(
        {
          "text-shadow": (value) => ({
            textShadow: value,
          }),
        },
        { values: theme("textShadow") }
      );
    }),
  ],
};
