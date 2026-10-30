/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#08101E",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
        },
        brand: {
          primary: "#0F172A",
          navy: "#1E293B",
          accent: "#2563EB",
          accentLight: "#3B82F6",
          softBlue: "#EFF6FF",
          light: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E2E8F0"
        }
      }
    },
  },
  plugins: [],
}
