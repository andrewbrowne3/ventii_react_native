import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {ThemeMode} from '../../theme/themes';

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = {mode: 'light'};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setMode: (state, action: PayloadAction<ThemeMode>) => {
      state.mode = action.payload;
    },
    toggleMode: (state) => {
      state.mode = state.mode === 'dark' ? 'light' : 'dark';
    },
  },
});

export const {setMode, toggleMode} = themeSlice.actions;
export default themeSlice.reducer;
