/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        warm: {
          50: '#FFFBF5',
          100: '#FFF5E8',
          200: '#FFE8C2',
          300: '#F59E0B',
          400: '#D97706',
          500: '#B45309',
        },
        ink: {
          900: '#3D2C1E',
          700: '#786B5E',
          500: '#A8998B',
          300: '#C4B5A5',
          100: '#EFE5D8',
          50: '#F8F2E9',
        },
        olive: {
          500: '#6B8E23',
          600: '#5A7D1E',
          100: '#F0F5E8',
        },
        coral: {
          500: '#D47766',
          100: '#FDF2F0',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Helvetica', 'Arial', 'sans-serif'],
      },
      animation: {
        'bounce-slow': 'bounce 2s infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
