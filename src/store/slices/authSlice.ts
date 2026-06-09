import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {User} from '../../types';
import {API_CONFIG} from '../../constants/config';
import {api, setTokens, clearTokens, getAccessToken, getRefreshToken} from '../../services/api';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Real login: POST /api/auth/login/ -> {access, refresh, user}. Stores tokens.
export const loginUser = createAsyncThunk(
  'auth/login',
  async (creds: {email: string; password: string}, {rejectWithValue}) => {
    try {
      const res = await api.post(API_CONFIG.ENDPOINTS.AUTH.LOGIN, creds);
      const {access, refresh, user} = res.data;
      await setTokens(access, refresh);
      return user as User;
    } catch (e: any) {
      return rejectWithValue(
        e?.response?.data?.detail || 'Invalid email or password.',
      );
    }
  },
);

// On app launch: if we have a stored token, re-validate it by loading the
// profile. Keeps a persisted session honest (clears it if the token is dead).
export const restoreSession = createAsyncThunk(
  'auth/restore',
  async (_, {rejectWithValue}) => {
    const token = await getAccessToken();
    if (!token) return rejectWithValue('no token');
    try {
      const res = await api.get(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
      return res.data as User;
    } catch (e) {
      await clearTokens();
      return rejectWithValue('session expired');
    }
  },
);

export const logoutUser = createAsyncThunk('auth/logout', async () => {
  const refresh = await getRefreshToken();
  if (refresh) {
    try {
      await api.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {refresh});
    } catch {
      // best-effort; we clear locally regardless
    }
  }
  await clearTokens();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => {
      s.isLoading = true;
      s.error = null;
    })
      .addCase(loginUser.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.isLoading = false;
        s.error = (a.payload as string) || a.error.message || 'Login failed';
      })
      .addCase(restoreSession.fulfilled, (s, a) => {
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(restoreSession.rejected, (s) => {
        s.user = null;
        s.isAuthenticated = false;
      })
      .addCase(logoutUser.fulfilled, (s) => {
        s.user = null;
        s.isAuthenticated = false;
        s.error = null;
      });
  },
});

export const {setUser} = authSlice.actions;
export default authSlice.reducer;
