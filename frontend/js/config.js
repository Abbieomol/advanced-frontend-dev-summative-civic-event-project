// App settings. Change the URLs here if the backend runs somewhere else.

const CONFIG = {
  APP_NAME: 'CivicEvents+',
  API_BASE_URL: 'http://localhost:4000/api',
  FILES_BASE_URL: 'http://localhost:4000',
  EVENTS_PER_PAGE: 6,
  REQUEST_TIMEOUT_MS: 20000,
  SUPPORT_EMAIL: 'support@civic.test',

  // Same limits as the backend (upload.middleware.js)
  UPLOADS: {
    image: { exts: ['jpg', 'jpeg', 'png', 'gif'], maxMB: 2, label: 'JPG, PNG or GIF' },
    audio: { exts: ['mp3', 'wav', 'm4a', 'ogg'], maxMB: 5, label: 'MP3, WAV, M4A or OGG' },
    video: { exts: ['mp4', 'mov', 'avi', 'mkv'], maxMB: 8, label: 'MP4, MOV, AVI or MKV' }
  },

  PROMOS_CACHE_MS: 60000
};
