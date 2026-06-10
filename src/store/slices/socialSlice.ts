import {createSlice, PayloadAction} from '@reduxjs/toolkit';

/**
 * Follow state. Persisted locally (redux-persist whitelist) and pushed to the
 * backend best-effort — the server follow endpoint is optional today, so the
 * optimistic local state is the source of truth for the UI.
 */
export interface OnboardingPrefs {
  city: string;
  areas: string[];
  interests: string[]; // vibes + custom, merged
  music: string[];
  tier: 'free' | 'pro' | 'black';
}

interface SocialState {
  following: string[]; // profile ids
  prefs: OnboardingPrefs | null; // collected at onboarding; synced later
}

const initialState: SocialState = {following: [], prefs: null};

const socialSlice = createSlice({
  name: 'social',
  initialState,
  reducers: {
    toggleFollow(state, action: PayloadAction<string>) {
      const id = action.payload;
      state.following = state.following.includes(id)
        ? state.following.filter((f) => f !== id)
        : [...state.following, id];
    },
    setOnboardingPrefs(state, action: PayloadAction<OnboardingPrefs>) {
      state.prefs = action.payload;
    },
  },
});

export const {toggleFollow, setOnboardingPrefs} = socialSlice.actions;
export default socialSlice.reducer;
