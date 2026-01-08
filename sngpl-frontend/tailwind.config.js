export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sngpl: {
          blue: '#0047AB',
          darkblue: '#001F3F',
          lightblue: '#4A90E2',
          green: '#10B981',
          dark: '#0A0F1E',
          darker: '#050810',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
