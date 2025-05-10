/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Modern pixel art palette
        'primary': {
          100: '#D0E8FF',
          200: '#5CB8FF',
          300: '#2080C0',
          400: '#1060A0',
          500: '#084880',
        },
        'environment': {
          'grass': '#80C050',
          'dirt': '#C09860',
          'stone': '#708090',
          'wood': '#C08040',
        },
        'character': {
          'skin-light': '#F8D8B0',
          'skin-dark': '#A86048',
          'hair-light': '#F0C000',
          'hair-dark': '#803010',
        },
        'ui-bg': '#303040',
        'ui-text': '#FFFFFF',
        'ui-accent': '#FFD700',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'cursive'],
      },
    },
  },
  plugins: [],
}; 