import type { Config } from 'tailwindcss';

export default {
  content: ['./apps/**/*.{ts,tsx}', './packages/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#123B73',
        emergency: '#DC2626',
        success: '#059669',
        warning: '#D97706',
        critical: '#6D28D9'
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      transitionDuration: {
        200: '200ms'
      }
    }
  },
  plugins: []
} satisfies Config;
