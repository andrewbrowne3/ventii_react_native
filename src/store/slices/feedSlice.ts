import {createSlice, PayloadAction} from '@reduxjs/toolkit';
import {Event} from '../../types';
import {EVENTS} from '../../data/mockEvents';

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
});

export const {swipe, resetDeck, toggleSaved} = feedSlice.actions;
export default feedSlice.reducer;
