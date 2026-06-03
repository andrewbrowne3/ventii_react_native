/**
 * VENTII — root component.
 *
 * Provider + PersistGate + SafeAreaProvider + GestureHandlerRoot + Navigator.
 * No backend wiring yet; auth login is mocked, all data is seeded from
 * /src/data/mock*.ts. See README for setup.
 */

import React from 'react';
import {StatusBar, View, Text} from 'react-native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {Provider, useSelector} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';

import {store, persistor, RootState} from './src/store/store';
import {AppNavigator} from './src/navigation/AppNavigator';
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
            <AppNavigator />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </PersistGate>
    </Provider>
  );
};

export default App;
