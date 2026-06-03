import {createSlice} from '@reduxjs/toolkit';
import {OwnedTicket} from '../../types';
import {OWNED_TICKETS} from '../../data/mockTickets';

interface WalletState {
  tickets: OwnedTicket[];
}

const initialState: WalletState = {
  tickets: OWNED_TICKETS,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {},
});

export default walletSlice.reducer;
