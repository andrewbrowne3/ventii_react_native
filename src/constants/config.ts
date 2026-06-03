/* App-wide config. Backend URLs swap from mock → real later. */

export const API_CONFIG = {
  BASE_URL: 'http://localhost:8000',  // TODO: real URL when backend lands
  AGENT_URL: 'http://localhost:4012',
  TIMEOUT: 10000,
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login/',
      LOGOUT: '/api/auth/logout/',
      REFRESH: '/api/auth/token/refresh/',
      PROFILE: '/api/auth/profile/',
    },
    EVENTS: '/api/events/',
    PROFILES: '/api/profiles/',
    TICKETS: '/api/tickets/',
    INBOX: '/api/inbox/',
    AGENT: {CHAT: '/chat', STREAM: '/chat/stream'},
    WEBSOCKET: '/ws/updates/',
  },
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: '@ventii/access_token',
  REFRESH_TOKEN: '@ventii/refresh_token',
  USER_DATA: '@ventii/user_data',
} as const;
