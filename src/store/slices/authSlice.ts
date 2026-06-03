import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {User} from '../../types';

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

// MOCK login — replace with real API call when backend is wired up.
export const loginUser = createAsyncThunk(
  'auth/login',
  async (creds: {email: string; password: string}) => {
    await new Promise((r) => setTimeout(r, 600));
    const mockUser: User = {
      id: 'u_demo',
      email: creds.email || 'demo@ventii.app',
      username: 'demo',
      first_name: 'Demo',
      last_name: 'User',
      full_name: 'Demo User',
      city: 'Atlanta',
      created_at: new Date().toISOString(),
      profile_picture: 'https://picsum.photos/seed/demo_user/200',
    };
    return mockUser;
  },
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logoutUser: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },
  },
  extraReducers: (b) => {
    b.addCase(loginUser.pending, (s) => {s.isLoading = true; s.error = null;})
      .addCase(loginUser.fulfilled, (s, a) => {
        s.isLoading = false;
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (s, a) => {
        s.isLoading = false;
        s.error = a.error.message || 'Login failed';
      });
  },
});

export const {logoutUser, setUser} = authSlice.actions;
export default authSlice.reducer;
