import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0b1220'
        }
      },
      backgroundImage: {
        'zoli-gradient': 'linear-gradient(to right, var(--tw-gradient-from), var(--tw-gradient-to))'
      }
    }
  },
  plugins: [require('tailwindcss-animate')]
} satisfies Config