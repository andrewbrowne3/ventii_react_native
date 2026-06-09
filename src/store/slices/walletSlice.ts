import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {OwnedTicket} from '../../types';
import {OWNED_TICKETS} from '../../data/mockTickets';
import {API_CONFIG} from '../../constants/config';
import {api, unwrapList} from '../../services/api';

interface WalletState {
  tickets: OwnedTicket[];
}

const initialState: WalletState = {
  tickets: OWNED_TICKETS,
};

// Load the authenticated user's tickets from GET /api/tickets/.
export const fetchTickets = createAsyncThunk('wallet/fetchTickets', async () => {
  const res = await api.get(API_CONFIG.ENDPOINTS.TICKETS);
  return unwrapList<OwnedTicket>(res.data);
});

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchTickets.fulfilled, (state, action) => {
      state.tickets = action.payload;
    });
  },
});

export default walletSlice.reducer;
