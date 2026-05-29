import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neon palette used across the game
        neon: {
          pink: "#ff2d95",
          purple: "#9d4edd",
          blue: "#00d4ff",
          green: "#39ff14",
          yellow: "#fdfd00",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        // Reusable glow effects
        "neon-blue": "0 0 8px #00d4ff, 0 0 20px #00d4ff66",
        "neon-pink": "0 0 8px #ff2d95, 0 0 24px #ff2d9566",
        "neon-green": "0 0 8px #39ff14, 0 0 24px #39ff1466",
      },
      keyframes: {
        // Pulsing glow for completed BINGO letters
        glow: {
          "0%, 100%": { textShadow: "0 0 8px #fff, 0 0 20px currentColor" },
          "50%": { textShadow: "0 0 16px #fff, 0 0 40px currentColor" },
        },
        // Subtle floating animation for the background blobs
        float: {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(-20px) scale(1.05)" },
        },
      },
      animation: {
        glow: "glow 1.6s ease-in-out infinite",
        float: "float 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
