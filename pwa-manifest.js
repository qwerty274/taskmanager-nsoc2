// Web app manifest for the installable app. Used by vite.config.js and checked by test-pwa.js.
// The icons live in public/ (pwa-*.png, apple-touch-icon.png, favicon.svg).
export const manifest = {
  name: 'Task Manager',
  short_name: 'Tasks',
  description: 'A private task manager with priorities, due dates, streaks and charts. Works offline.',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'any',
  // Matches --ground in the dark theme (src/index.css), which is the default.
  background_color: '#000000',
  theme_color: '#000000',
  categories: ['productivity'],
  icons: [
    { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
