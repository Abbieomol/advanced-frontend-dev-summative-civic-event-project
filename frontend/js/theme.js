/**
 * theme.js
 * Tailwind CDN configuration: the CivicEvents+ theme in Nairobi's colours
 * (green, yellow, white and black) with Arial as the font.
 * Loaded straight after the Tailwind CDN script on every page.
 *
 * Contrast (WCAG AA needs 4.5:1 for text):
 *   white on brand-700 6.7:1 · white on brand-600 5.0:1 · brand-800 on brand-50 8.4:1
 *   black on sun-400 14.4:1
 */
tailwind.config = {
  theme: {
    extend: {
      colors: {
        // Nairobi green
        brand: {
          50: '#effaf3', 100: '#d6f2e0', 200: '#ade4c2', 300: '#77cf9b', 400: '#3fb472',
          500: '#1a9a55', 600: '#0f8044', 700: '#0a6a38', 800: '#08552d', 900: '#064224'
        },
        // Nairobi yellow (use with black text, never white)
        sun: { 100: '#fff7cc', 200: '#ffec99', 300: '#ffe066', 400: '#ffd100', 500: '#f5c400' },
        ink: '#0a0a0a'
      },
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif']
      }
    }
  }
};
