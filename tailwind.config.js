/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f9fafb',   // Very light gray
          100: '#f3f4f6',  // Light gray
          200: '#e5e7eb',  // Pale gray
          300: '#d1d5db',  // Soft gray
          400: '#9ca3af',  // Medium gray
          500: '#6b7280',  // Gray
          600: '#4b5563',  // Dark gray (main)
          700: '#374151',  // Deeper gray
          800: '#1f2937',  // Dark gray/black
          900: '#111827',  // Deepest black
        },
        accent: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        surface: {
          DEFAULT: '#fafafa',
          card: '#ffffff',
          dark: '#111827',
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        'soft': '0 4px 20px -4px rgba(0,0,0,.08), 0 2px 8px -2px rgba(0,0,0,.04)',
        'card': '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.03)',
        'glow': '0 0 0 1px rgba(75, 85, 99, 0.15), 0 4px 14px -2px rgba(31, 41, 55, 0.2)',
        'gold': '0 4px 20px -4px rgba(31, 41, 55, 0.25), 0 2px 8px -2px rgba(17, 24, 39, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
