import {configureStore} from '@reduxjs/toolkit';
import {combineReducers} from '@reduxjs/toolkit';
import {persistStore, persistReducer, createMigrate} from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';

import auth from './slices/authSlice';
import theme from './slices/themeSlice';
import feed from './slices/feedSlice';
import wallet from './slices/walletSlice';
import social from './slices/socialSlice';

const rootReducer = combineReducers({auth, theme, feed, wallet, social});

// v1 relaunches the app on the new light frosted direction, so reset any
// theme persisted by the previous dark build to the new default.
const migrations = {
  1: (state: any) => ({...state, theme: {mode: 'light'}}),
};

const persistConfig = {
  key: 'root',
  version: 1,
  storage: AsyncStorage,
  whitelist: ['auth', 'theme', 'social'], // persist auth + theme + follows
  migrate: createMigrate(migrations),
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
