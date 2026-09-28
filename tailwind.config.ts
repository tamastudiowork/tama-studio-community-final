import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#131318",
          soft: "#1B1B22",
          surface: "#20202A",
          line: "#2E2E3A",
        },
        paper: {
          DEFAULT: "#F3F1EC",
          dim: "#B9B6C4",
          faint: "#807D8F",
        },
        amber: {
          DEFAULT: "#F2A93B",
          soft: "#F7C878",
          dim: "#8A6524",
        },
        mint: {
          DEFAULT: "#3FD69C",
          soft: "#8FEFC6",
          dim: "#1F5B44",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(242,169,59,0.18), 0 8px 30px -12px rgba(242,169,59,0.25)",
      },
      keyframes: {
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
        typeline: {
          from: { width: "0%" },
          to: { width: "100%" },
        },
        floatSlow: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
        gradientShift: {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        blink: "blink 1s steps(1) infinite",
        float: "floatSlow 6s ease-in-out infinite",
        "pulse-glow": "pulseGlow 3s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
      },
    },
  },
  plugins: [],
};
export default config;
