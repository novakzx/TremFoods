import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF7F2',
        surface: '#FFFFFF',
        line: '#EAE3D8',
        ink: '#231506',
        muted: '#6F6353',
        accent: { DEFAULT: '#FFB020', hover: '#FFC658', ink: '#231506' },
        brand: { DEFAULT: '#FF6A00', deep: '#E25C00', soft: '#FFF1E6' },
        danger: '#C8382D',
        success: '#18794E',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'system-ui', 'sans-serif'],
      },
      spacing: { 4.5: '1.125rem' },
      boxShadow: {
        card: '0 1px 2px rgba(35,21,6,0.05)',
        float: '0 8px 24px -8px rgba(35,21,6,0.18)',
      },
      borderRadius: { xl2: '1rem' },
    },
  },
  plugins: [],
};
export default config;
