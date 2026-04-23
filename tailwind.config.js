import { emerald, gray, red, slate } from 'tailwindcss/colors';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      colors: {
        background: '#060b17',         // Your specified dark background
        foreground: slate[100],        // Light text for good contrast

        card: {
          DEFAULT: '#0c1324',         // Slightly lighter than background
          foreground: slate[100],
        },

        popover: {
          DEFAULT: '#0c1324',
          foreground: slate[100],
        },

        primary: {
          DEFAULT: emerald[500],      // Emerald as brand color
          foreground: 'white',
        },

        secondary: {
          DEFAULT: slate[700],
          foreground: slate[100],
        },

        muted: {
          DEFAULT: slate[800],
          foreground: slate[400],
        },

        accent: {
          DEFAULT: emerald[700],
          foreground: emerald[400],
        },

        destructive: {
          DEFAULT: red[600],
          foreground: 'white',
        },

        border: slate[700],            // Subtle border color
        input: slate[700],             // Input borders
        ring: emerald[500],            // Ring highlight color

        chart: {
          1: emerald[500],
          2: emerald[400],
          3: emerald[300],
          4: emerald[200],
          5: emerald[100],
        },
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
