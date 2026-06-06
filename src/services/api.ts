/**
 * API client for the Ventii backend (https://ventii.andrewbrowne.org).
 *
 * - Attaches the JWT access token to every request.
 * - On a 401, transparently refreshes the access token once and retries.
 * - Tokens live in AsyncStorage under the keys in src/constants/config.ts.
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {API_CONFIG, STORAGE_KEYS} from '../constants/config';

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {'Content-Type': 'application/json'},
});

// ───── token storage helpers ─────────────────────────────────────────────

export async function setTokens(access: string, refresh: string): Promise<void> {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.ACCESS_TOKEN, access],
    [STORAGE_KEYS.REFRESH_TOKEN, refresh],
  ]);
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
  ]);
}

export function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
}

export function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
}

// ───── interceptors ───────────────────────────────────────────────────────

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// De-duplicate concurrent refreshes: all 401s share one refresh promise.
let refreshing: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const refresh = await getRefreshToken();
        if (!refresh) return null;
        // Bare axios (not `api`) so we don't loop through this interceptor.
        const res = await axios.post(
          `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
          {refresh},
        );
        const access: string = res.data.access;
        await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, access);
        return access;
      } catch {
        await clearTokens();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && original && !original._retry) {
      original._retry = true;
      const access = await refreshAccessToken();
      if (access) {
        original.headers.Authorization = `Bearer ${access}`;
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** DRF list endpoints are paginated ({count, results}); unwrap to the array. */
export function unwrapList<T>(data: any): T[] {
  return Array.isArray(data) ? data : (data?.results ?? []);
}

// ───── ticketing / deals actions ──────────────────────────────────────────

/** RSVP to an event → mints a free pass into the wallet. Returns the Pass. */
export async function rsvpToEvent(eventId: string) {
  const res = await api.post(`/api/events/${eventId}/rsvp/`);
  return res.data;
}

/** Start paid checkout → {client_secret, pass}. Throws 503 until Stripe is set. */
export async function checkoutEvent(eventId: string, optionId: string, quantity = 1) {
  const res = await api.post(`/api/events/${eventId}/checkout/`, {
    option_id: optionId,
    quantity,
  });
  return res.data;
}

/** Redeem a deal offer with a venue staff code → mints a Redemption voucher. */
export async function redeemDeal(dealId: string, offerId: string, staffCode: string) {
  const res = await api.post(`/api/deals/${dealId}/redeem/`, {
    offer_id: offerId,
    staff_code: staffCode,
  });
  return res.data;
}

/** The user's redeemed deal vouchers (Wallet > Deals). */
export async function fetchRedemptions() {
  const res = await api.get('/api/redemptions/');
  return unwrapList(res.data);
}

/** Host scan: verify + check in a pass by its signed QR value → {ok, reason, pass}. */
export async function scanPass(qrValue: string) {
  const res = await api.post('/api/scan/', {qr_value: qrValue});
  return res.data;
}
