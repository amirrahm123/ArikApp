import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F7F5F2',
        surface: '#FFFFFF',
        'surface-2': '#F0EDE8',
        'surface-hover': '#F0EDE8',
        accent: '#C0392B',
        'accent-hover': '#A93226',
        'accent-light': '#FDECEA',
        black: '#1A1A1A',
        muted: '#6B7280',
        'gray-light': '#E5E0D8',
        gold: '#C9A84C',
        success: '#16A34A',
        'success-light': '#DCFCE7',
        warning: '#D97706',
        'warning-light': '#FEF3C7',
      },
      fontFamily: {
        display: ['Bebas Neue', 'sans-serif'],
        sans: ['DM Sans', 'Heebo', 'sans-serif'],
      },
      keyframes: {
        barberpole: {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '42px 0' },
        },
      },
      animation: {
        barberpole: 'barberpole 1s linear infinite',
      },
    },
  },
  plugins: [],
};
export default config;
