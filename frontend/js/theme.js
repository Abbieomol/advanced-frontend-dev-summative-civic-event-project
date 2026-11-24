// Tailwind theme: Nairobi colours (green, yellow, white, black) + Arial

tailwind.config = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf3', 100: '#d6f2e0', 200: '#ade4c2', 300: '#77cf9b', 400: '#3fb472',
          500: '#1a9a55', 600: '#0f8044', 700: '#0a6a38', 800: '#08552d', 900: '#064224'
        },
        // yellow - only use it with black text, white on yellow is unreadable
        sun: { 100: '#fff7cc', 200: '#ffec99', 300: '#ffe066', 400: '#ffd100', 500: '#f5c400' },
        ink: '#0a0a0a'
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif']
      }
    }
  }
};
