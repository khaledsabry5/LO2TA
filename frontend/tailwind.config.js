/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Light mode ONLY: dark variants only activate with a `.dark` class that is never applied,
  // so OS-level `prefers-color-scheme: dark` is completely ignored.
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#1f1f1f',
          muted: '#6b6b6b',
        },
        // Main accent
        cream: {
          DEFAULT: '#faedcd',
          50: '#fffcf5',
          100: '#fdf6e6',
          200: '#faedcd',
          300: '#f3dcaa',
          400: '#e8c787',
          500: '#d9ad62',
        },
        // Secondary accent (use sparingly)
        azure: {
          DEFAULT: '#00a6fb',
          dark: '#0088cc',
        },
        // Discount badge
        sale: {
          DEFAULT: '#ef233c',
          dark: '#d01a31',
        },
      },
      fontFamily: {
        sans: ['Tajawal', 'system-ui', 'sans-serif'],
        logo: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.12)',
        lift: '0 20px 40px -18px rgba(0,0,0,.25)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(-100%)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.25)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up .5s ease-out both',
        shimmer: 'shimmer 1.4s infinite',
        pop: 'pop .35s ease-out',
      },
    },
  },
  plugins: [],
}
