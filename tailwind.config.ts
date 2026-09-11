import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FFF8F1',
        surface: '#FFFFFF',
        line: '#F0E2CC',
        ink: '#231506',
        muted: '#8A7860',
        accent: { DEFAULT: '#FFB020', hover: '#FFC658', ink: '#231506' },
        brand: { DEFAULT: '#FF6A00', deep: '#D94F0A' },
        danger: '#D9483D',
        success: '#1C8F5A',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(35,21,6,0.04), 0 14px 34px -16px rgba(35,21,6,0.18)',
        float: '0 22px 55px -18px rgba(35,21,6,0.32)',
        glow: '0 10px 28px -6px rgba(255,106,0,0.45)',
      },
      borderRadius: { xl2: '1.5rem' },
    },
  },
  plugins: [],
};
export default config;
