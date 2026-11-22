/**
 * config.js
 * App-wide settings. This is the only file you need to change if the
 * backend runs somewhere other than http://localhost:4000.
 */
const CONFIG = {
  APP_NAME: 'CivicEvents+',
  API_BASE_URL: 'http://localhost:4000/api', // every API path is added to this
  FILES_BASE_URL: 'http://localhost:4000',   // uploaded images/audio/video live under /uploads
  EVENTS_PER_PAGE: 6,
  REQUEST_TIMEOUT_MS: 20000,
  SUPPORT_EMAIL: 'support@civicevents.example',

  // Upload rules, matching the backend's multer settings (upload.middleware.js),
  // so the user sees a clear error before uploading anything.
  UPLOADS: {
    image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 2, label: 'JPG, PNG or GIF' },
    audio: { exts: ['mp3', 'wav', 'm4a', 'ogg'], maxMB: 5, label: 'MP3, WAV, M4A or OGG' },
    video: { exts: ['mp4', 'mov', 'avi', 'mkv'], maxMB: 8, label: 'MP4, MOV, AVI or MKV' }
  },

  // How long the promos list is cached in the browser (milliseconds)
  PROMOS_CACHE_MS: 60000
};
