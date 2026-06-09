/**
 * VENTII — root component.
 *
 * Provider + PersistGate + SafeAreaProvider + GestureHandlerRoot + Navigator.
 * Wired to the live backend (https://ventii.andrewbrowne.org): auth is real
 * JWT, the event deck and wallet load from the API. See src/services/api.ts.
 */

import React, {useEffect} from 'react';
import {StatusBar, View, Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider, useSelector, useDispatch} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';

import {store, persistor, RootState, AppDispatch} from './src/store/store';
import {AppNavigator} from './src/navigation/AppNavigator';
import {restoreSession} from './src/store/slices/authSlice';
import {getTheme} from './src/theme/themes';

const ThemedStatusBar: React.FC = () => {
  const mode = useSelector((s: RootState) => s.theme.mode);
  return (
    <StatusBar
      barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      backgroundColor={getTheme(mode).bg.primary}
    />
  );
};

// Re-validate any stored JWT on launch: loads the profile if the token is
// still good, or clears the persisted session if it has expired.
const SessionBootstrap: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(restoreSession());
  }, [dispatch]);
  return null;
};

const PersistLoader: React.FC = () => (
  <View style={{flex: 1, backgroundColor: '#0A0A0F', justifyContent: 'center', alignItems: 'center'}}>
    <Text style={{color: '#E8E8F0', fontSize: 12, fontWeight: '700', letterSpacing: 4}}>
      VENTII
    </Text>
  </View>
);

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <PersistGate loading={<PersistLoader />} persistor={persistor}>
        <GestureHandlerRootView style={{flex: 1}}>
          <SafeAreaProvider>
            <ThemedStatusBar />
            <SessionBootstrap />
            <AppNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default App;
