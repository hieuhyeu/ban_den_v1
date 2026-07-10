export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'SF Mono', 'monospace'],
      },
      colors: {
        billiard: {
          bg: '#0D0E11',
          card: '#16181D',
          border: '#262930',
          accent: '#7F56D9',
        }
      }
    },
  },
  plugins: [],
}
