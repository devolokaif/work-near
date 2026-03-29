/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          primary: '#F4600C',
          light: '#FF7A30',
          dark: '#C84E00',
        },
        stone: {
          dark: '#2C2417',
          mid: '#5C4A32',
          light: '#A08060',
        },
        cream: {
          DEFAULT: '#FAF7F2',
          dark: '#F0EAE0',
        }
      },
      fontFamily: {
        display: ['DM Serif Display', 'serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        xl: '20px',
        '2xl': '28px',
      }
    },
  },
  plugins: [],
};