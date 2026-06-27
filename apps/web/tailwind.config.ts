import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#080809",
        surface: "#0f0f12",
        elevated: "#16161b",
        accent: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          glow: "rgba(99,102,241,0.15)",
        },
        muted: "#44445a",
        primary: "#f2f2f7",
        secondary: "#9494a8",
        success: {
          DEFAULT: "#22c55e",
          bg: "rgba(34,197,94,0.08)",
        },
        warning: {
          DEFAULT: "#f59e0b",
          bg: "rgba(245,158,11,0.08)",
        },
        danger: {
          DEFAULT: "#ef4444",
          bg: "rgba(239,68,68,0.08)",
        },
        info: {
          DEFAULT: "#3b82f6",
          bg: "rgba(59,130,246,0.08)",
        },
      },
    },
  },
  plugins: [],
};
export default config;
