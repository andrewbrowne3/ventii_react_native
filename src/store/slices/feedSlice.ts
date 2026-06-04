import {createSlice, createAsyncThunk, PayloadAction} from '@reduxjs/toolkit';
import {Event} from '../../types';
import {EVENTS} from '../../data/mockEvents';
import {API_CONFIG} from '../../constants/config';
import {api, unwrapList} from '../../services/api';

// Pull the live event deck from the backend. Falls back to mock data (the
// initial state) if the request fails, so the app still shows something.
export const fetchEvents = createAsyncThunk('feed/fetchEvents', async () => {
  const res = await api.get(API_CONFIG.ENDPOINTS.EVENTS);
  return unwrapList<Event>(res.data);
});

type SwipeDirection = 'left' | 'right' | 'up';

interface SwipedRecord {
  event_id: string;
  direction: SwipeDirection;
  at: string;
}

interface FeedState {
  events: Event[];
  topIndex: number;
  history: SwipedRecord[];
  saved: string[]; // event ids
}

const initialState: FeedState = {
  events: EVENTS,
  topIndex: 0,
  history: [],
  saved: [],
};

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    swipe: (state, action: PayloadAction<SwipeDirection>) => {
      const event = state.events[state.topIndex];
      if (!event) return;
      state.history.push({
        event_id: event.id,
        direction: action.payload,
        at: new Date().toISOString(),
      });
      if (action.payload === 'right' || action.payload === 'up') {
        if (!state.saved.includes(event.id)) {
          state.saved.push(event.id);
        }
      }
      state.topIndex += 1;
    },
    resetDeck: (state) => {
      state.topIndex = 0;
      state.history = [];
    },
    toggleSaved: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.saved.includes(id)) {
        state.saved = state.saved.filter((x) => x !== id);
      } else {
        state.saved.push(id);
      }
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchEvents.fulfilled, (state, action) => {
      if (action.payload.length > 0) {
        state.events = action.payload;
        state.topIndex = 0;
      }
    });
  },
});

export const {swipe, resetDeck, toggleSaved} = feedSlice.actions;
export default feedSlice.reducer;
