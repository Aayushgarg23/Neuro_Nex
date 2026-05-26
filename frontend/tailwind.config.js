/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          50: '#E8F0FE',
          100: '#D2E3FC',
          200: '#AECBFA',
          300: '#8AB4F8',
          400: '#669DF6',
          500: '#1A73E8', // Google Blue
          600: '#1967D2',
          700: '#185ABC',
          800: '#174EA6',
          900: '#123D82',
        },
        success: {
          500: '#1E8E3E', // Google Green
        },
        warning: {
          500: '#F9AB00', // Google Yellow
        },
        danger: {
          500: '#D93025', // Google Red
        }
      },
      animation: {
        'count-up': 'countUp 0.6s ease-out forwards',
        'fill-bar': 'fillBar 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
      keyframes: {
        countUp: {
          from: { opacity: 0, transform: 'translateY(10px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        fillBar: {
          from: { width: 0 },
          to: { width: 'var(--target-width)' },
        },
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgba(60,64,67,0.3), 0 1px 3px 1px rgba(60,64,67,0.15)',
        'card-hover': '0 1px 3px 0 rgba(60,64,67,0.3), 0 4px 8px 3px rgba(60,64,67,0.15)',
      }
    },
  },
  plugins: [],
};
