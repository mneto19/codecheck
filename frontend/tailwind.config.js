/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "sans-serif"],
        body: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        // Paleta dark com tons "ink" personalizados
        ink: {
          950: "#08080e",
          900: "#0f0f18",
          800: "#17171f",
          700: "#21212d",
          600: "#2e2e3d",
          500: "#45455a",
          400: "#66667a",
          300: "#909099",
          200: "#c0c0cc",
          100: "#e4e4ed",
          50:  "#f4f4f7",
        },
        acid: "#00ff87",
        warn: "#ff6b35",
        danger: "#ff3355",
      },
    },
  },
  plugins: [],
};
