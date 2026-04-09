import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50:  '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#D4AF37',
          500: '#C9A84C',
          600: '#B8960C',
          700: '#92740A',
          800: '#7A5F08',
          900: '#5C4606',
        },
        dark: {
          50:  '#f5f5f5',
          100: '#e5e5e5',
          200: '#d4d4d4',
          300: '#a3a3a3',
          400: '#737373',
          500: '#525252',
          600: '#404040',
          700: '#2a2a2a',
          800: '#1a1a1a',
          900: '#111111',
          950: '#0a0a0a',
        },
        silver: {
          300: '#e8e8e8',
          400: '#C0C0C0',
          500: '#A8A9AD',
          600: '#888888',
        },
        status: {
          ok:       '#22c55e',
          pendente: '#f59e0b',
          critico:  '#ef4444',
          inativo:  '#6b7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #C9A84C 50%, #B8960C 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1a1a1a 0%, #111111 100%)',
      },
    },
  },
  plugins: [],
} satisfies Config
