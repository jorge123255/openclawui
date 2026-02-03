import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        background: "#0a0a0f",
        foreground: "#fafafa",
        card: {
          DEFAULT: "#141419",
          hover: "#1a1a22",
        },
        primary: {
          DEFAULT: "#6366f1",
          hover: "#818cf8",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#27272a",
          hover: "#3f3f46",
          foreground: "#fafafa",
        },
        accent: {
          DEFAULT: "#22c55e",
          hover: "#16a34a",
        },
        muted: {
          DEFAULT: "#27272a",
          foreground: "#a1a1aa",
        },
        border: "#27272a",
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.5rem",
        sm: "0.25rem",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
