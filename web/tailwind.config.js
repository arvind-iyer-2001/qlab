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
        bg: '#1a1a1a',
        panel: '#282828',
        border: '#3a3a3a',
        accent: '#ffa116',
        easy: '#00b8a3',
        medium: '#ffc01e',
        hard: '#ef4743',
        'code-bg': '#1e1e1e',
        text: {
          primary: '#eff1f6',
          secondary: '#aba9b0',
          muted: '#5a5a5a',
        },
      },
    },
  },
  plugins: [],
}
