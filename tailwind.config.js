/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}', './lib/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'blueprism-blue': '#0C4DD6',
        'blueprism-darkblue': '#062B73',
        'blueprism-lightblue': '#E5F0FF',
        'nomion-purple': '#6355F6',
      },
    },
  },
  plugins: [],
};

