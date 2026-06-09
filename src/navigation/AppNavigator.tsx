import React from 'react';
import {View} from 'react-native';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {useSelector} from 'react-redux';
import {Home, Calendar, Sparkles, Bell, User} from 'lucide-react-native';

import {RootState} from '../store/store';
import {RootStackParamList, BottomTabParamList} from '../types/navigation';
import {useTheme} from '../hooks/useTheme';

import {LoginScreen} from '../screens/LoginScreen';
import {HomeFeedScreen} from '../screens/HomeFeedScreen';
import {CalendarScreen} from '../screens/CalendarScreen';
import {AIConciergeScreen} from '../screens/AIConciergeScreen';
import {ActivityScreen} from '../screens/ActivityScreen';
import {ProfileScreen} from '../screens/ProfileScreen';
import {EventDetailScreen} from '../screens/EventDetailScreen';
import {WalletScreen} from '../screens/WalletScreen';
import {TicketDetailScreen} from '../screens/TicketDetailScreen';
import {SettingsScreen} from '../screens/SettingsScreen';
import {CreateEventScreen} from '../screens/CreateEventScreen';
import {HostScanScreen} from '../screens/HostScanScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<BottomTabParamList>();

type LucideIcon = React.ComponentType<{size?: number; color?: string; strokeWidth?: number}>;

const TabIcon: React.FC<{Icon: LucideIcon; focused: boolean; color: string}> = ({Icon, focused, color}) => (
  <View style={{alignItems: 'center', justifyContent: 'center', paddingTop: 4}}>
    <Icon
      size={focused ? 26 : 24}
      color={color}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  </View>
);

const MainTabs: React.FC = () => {
  const t = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: t.text.primary,
        tabBarInactiveTintColor: t.text.tertiary,
        tabBarStyle: {
          backgroundColor: t.glass.fillStrong,
          borderTopColor: t.glass.border,
          height: 64,
          paddingTop: 6,
        },
      }}>
      <Tab.Screen
        name="HomeTab" component={HomeFeedScreen}
        options={{tabBarIcon: ({focused, color}) => <TabIcon Icon={Home} focused={focused} color={color} />}}
      />
      <Tab.Screen
        name="CalendarTab" component={CalendarScreen}
        options={{tabBarIcon: ({focused, color}) => <TabIcon Icon={Calendar} focused={focused} color={color} />}}
      />
      <Tab.Screen
        name="AITab" component={AIConciergeScreen}
        options={{
          tabBarIcon: ({focused}) => (
            <TabIcon
              Icon={Sparkles}
              focused={focused}
              color={t.accents.pulse.base}
            />
          ),
        }}
      />
      <Tab.Screen
        name="ActivityTab" component={ActivityScreen}
        options={{tabBarIcon: ({focused, color}) => <TabIcon Icon={Bell} focused={focused} color={color} />}}
      />
      <Tab.Screen
        name="ProfileTab" component={ProfileScreenWithWalletButton}
        options={{tabBarIcon: ({focused, color}) => <TabIcon Icon={User} focused={focused} color={color} />}}
      />
    </Tab.Navigator>
  );
};

// Wrap ProfileScreen in a quick router that includes a Wallet entry via FAB-like
// for simplicity here — wallet is reachable from Profile's "Going" tab in this
// scaffold. A future iteration can promote Wallet to its own tab if you want.
const ProfileScreenWithWalletButton: React.FC = () => <ProfileScreen />;

export const AppNavigator: React.FC = () => {
  const isAuthenticated = useSelector((s: RootState) => s.auth.isAuthenticated);
  const t = useTheme();

  return (
    <NavigationContainer
      theme={{
        dark: t.mode === 'dark',
        colors: {
          background: t.bg.primary,
          card: t.bg.primary,
          text: t.text.primary,
          primary: t.accents.aurora.base,
          border: t.border.subtle,
          notification: t.status.danger,
        },
        fonts: {
          regular: {fontFamily: 'System', fontWeight: '400'},
          medium: {fontFamily: 'System', fontWeight: '500'},
          bold: {fontFamily: 'System', fontWeight: '700'},
          heavy: {fontFamily: 'System', fontWeight: '800'},
        },
      }}>
      <RootStack.Navigator screenOptions={{headerShown: false}}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={LoginScreen} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="EventDetail"
              component={EventDetailScreen}
              options={{presentation: 'card', animation: 'slide_from_bottom'}}
            />
            <RootStack.Screen name="Wallet" component={WalletScreen} options={{presentation: 'card'}} />
            <RootStack.Screen
              name="CreateEvent"
              component={CreateEventScreen}
              options={{presentation: 'modal'}}
            />
            <RootStack.Screen name="TicketDetail" component={TicketDetailScreen} />
            <RootStack.Screen name="HostScan" component={HostScanScreen} options={{presentation: 'card'}} />
            <RootStack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{presentation: 'modal'}}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
