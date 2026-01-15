import plugin from "tailwindcss/plugin";

/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		fontFamily: {
  			inter: [
  				'var(--font-inter)'
  			]
  		},
  		colors: {
  			// ===========================================
  			// HEARTH BRAND COLORS
  			// ===========================================
  			
  			// Primary brand purple - used for text, backgrounds, UI elements
  			["brand-purple"]: {
  				DEFAULT: '#8385a6',    // Main purple - body text, secondary elements
  				dark: '#4B4E6C',       // Darker purple - headings
  				darker: '#34364b',     // Even darker - emphasis text
  				darkest: '#1e1f2b',    // Darkest - buttons, strong emphasis
  				light: '#bfc0d1',      // Light purple - placeholders, muted text
  				lighter: '#E5E5EC'     // Lightest - backgrounds, borders
  			},
  			
  			// Accent orange - used for highlights, CTAs, animations
  			["brand-orange"]: {
  				DEFAULT: '#a7715f',    // Main orange - pulsing dot, accents
  				dark: '#744f42',       // Dark orange - hover states
  				light: '#c19b8f',      // Light orange - subtle accents
  				lighter: '#d3b8af',    // Lighter - backgrounds
  				lightest: '#ede2df'    // Lightest - very subtle backgrounds
  			},
  			
  			// ===========================================
  			// THIRD-PARTY BRAND COLORS
  			// ===========================================
  			slack: {
  				purple: '#611F69'
  			},
  			
  			// ===========================================
  			// SHADCN UI SYSTEM COLORS (CSS Variables)
  			// ===========================================
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			}
  		},
  		backgroundImage: {
  			onboarding: "url('/backgrounds/onboarding.png')",
  			noiseOverlay: "url('/backgrounds/noiseOverlay.png')"
  		},
  		animation: {
  			'slide-up': 'slide-up 0.4s ease-in-out forwards',
  			'fade-in-down': 'fade-in-down 0.1s ease-out'
  		},
  		boxShadow: {
  			custom: '0 0 5px 10px #fff',
  			'custom-sm': '0 0 5px 5px #fff'
  		},
  		maxWidth: {
  			prose: '70ch'
  		},
  		gridTemplateRows: {
  			layout: 'min-content 1fr min-content'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	},
  	textShadow: {
  		bold: '0 0 0px var(--tw-shadow-color)'
  	}
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
      require("tailwindcss-animate")
],
};
