import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0d0d0d',
        surface: '#1a1a1a',
        'surface-hover': '#242424',
        accent: '#c0392b',
        'accent-hover': '#e74c3c',
        muted: '#888',
      },
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
