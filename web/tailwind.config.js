/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#09090b',
        surface: '#18181b',
        'surface-2': 'rgba(39, 39, 42, 0.5)',
        border: '#27272a',
        fg: {
          primary: '#fafafa',
          secondary: '#d4d4d8',
          muted: '#71717a',
        },
        primary: {
          DEFAULT: '#10b981',
          hover: '#34d399',
        },
        easy: '#34d399',
        medium: '#fbbf24',
        hard: '#f87171',
      },
    },
  },
  plugins: [],
}
