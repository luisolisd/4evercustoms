/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identidad 4EVRcustoms — naranja "ember"
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
          950: '#431407',
        },
        // Neutros "ink" cálidos para sidebar y superficies oscuras
        ink: {
          50:  '#f6f6f7',
          100: '#e7e7ea',
          200: '#cfd0d6',
          300: '#a9abb5',
          400: '#7c7f8d',
          500: '#5c5f6e',
          600: '#494b58',
          700: '#3b3d48',
          800: '#24262f',
          900: '#171820',
          950: '#0e0f15',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft:     '0 1px 2px 0 rgb(16 18 27 / 0.04), 0 1px 3px 0 rgb(16 18 27 / 0.06)',
        card:     '0 1px 3px rgb(16 18 27 / 0.05), 0 8px 24px -12px rgb(16 18 27 / 0.12)',
        elevated: '0 4px 12px -2px rgb(16 18 27 / 0.10), 0 18px 40px -16px rgb(16 18 27 / 0.22)',
        glow:     '0 8px 24px -8px rgb(234 88 12 / 0.45)',
        'inner-top': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #fb923c 0%, #ea580c 55%, #c2410c 100%)',
        'ink-gradient':   'linear-gradient(180deg, #1b1c25 0%, #131319 60%, #0e0f15 100%)',
        'mesh':           'radial-gradient(60% 70% at 15% 0%, rgba(251,146,60,0.18) 0%, transparent 60%), radial-gradient(50% 60% at 100% 100%, rgba(234,88,12,0.14) 0%, transparent 55%)',
      },
      keyframes: {
        'fade-in':    { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'fade-up':    { '0%': { opacity: '0', transform: 'translateY(10px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'scale-in':   { '0%': { opacity: '0', transform: 'scale(0.96)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
        'slide-in-right': { '0%': { opacity: '0', transform: 'translateX(16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
        shimmer:      { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in':  'fade-in 0.4s ease-out both',
        'fade-up':  'fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both',
        'scale-in': 'scale-in 0.25s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slide-in-right 0.35s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
};
