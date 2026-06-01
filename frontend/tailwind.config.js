/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:          "oklch(0.165 0.008 165)",
        "bg-2":      "oklch(0.195 0.009 165)",
        surface:     "oklch(0.225 0.011 167)",
        "surface-2": "oklch(0.262 0.012 167)",
        "surface-3": "oklch(0.30 0.013 167)",
        line:        "oklch(0.315 0.013 167)",
        "line-2":    "oklch(0.40 0.015 167)",
        ink:         "oklch(0.975 0.004 165)",
        "ink-2":     "oklch(0.80 0.008 165)",
        "ink-3":     "oklch(0.60 0.010 165)",
        accent: {
          DEFAULT: "oklch(0.80 0.165 150)",
          ink:     "oklch(0.22 0.03 158)",
          dim:     "oklch(0.52 0.10 155)",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      borderRadius: { xl: "0.875rem", "2xl": "1rem" },
    },
  },
  plugins: [],
};
