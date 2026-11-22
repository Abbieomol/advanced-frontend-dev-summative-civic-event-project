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
  SUPPORT_EMAIL: 'support@civicevents.example'
};
