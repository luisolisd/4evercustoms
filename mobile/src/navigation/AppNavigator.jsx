import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View, ActivityIndicator, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { registerPushToken } from '../services/notifications';

import { useAuthStore } from '../store/authStore';
import { COLORS } from '../constants/theme';

import LoginScreen             from '../screens/LoginScreen';
import HomeScreen              from '../screens/HomeScreen';
import VehiclesScreen          from '../screens/VehiclesScreen';
import VehicleDetailScreen     from '../screens/VehicleDetailScreen';
import AppointmentsScreen      from '../screens/AppointmentsScreen';
import BookAppointmentScreen   from '../screens/BookAppointmentScreen';
import HistoryScreen           from '../screens/HistoryScreen';
import NotificationsScreen     from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.gray400,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#e5e7eb',
          height: 60,
          paddingBottom: 8,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Home:          focused ? 'home' : 'home-outline',
            Vehicles:      focused ? 'car' : 'car-outline',
            Appointments:  focused ? 'calendar' : 'calendar-outline',
            History:       focused ? 'time' : 'time-outline',
            Notifications: focused ? 'notifications' : 'notifications-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home"          component={HomeScreen}          options={{ tabBarLabel: 'Inicio' }} />
      <Tab.Screen name="Vehicles"      component={VehiclesScreen}      options={{ tabBarLabel: 'Vehículos' }} />
      <Tab.Screen name="Appointments"  component={AppointmentsScreen}  options={{ tabBarLabel: 'Citas' }} />
      <Tab.Screen name="History"       component={HistoryScreen}       options={{ tabBarLabel: 'Historial' }} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} options={{ tabBarLabel: 'Avisos' }} />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"             component={MainTabs} />
      <Stack.Screen name="VehicleDetail"    component={VehicleDetailScreen} />
      <Stack.Screen name="BookAppointment"  component={BookAppointmentScreen} />
    </Stack.Navigator>
  );
}

async function registerForPushNotifications() {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await registerPushToken(tokenData.data);
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: '4EVRcustoms',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch (e) {
    console.warn('[Push] Error registrando token:', e.message);
  }
}

function RootNavigator() {
  const { user, isLoading, init } = useAuthStore();

  useEffect(() => { init(); }, []);

  useEffect(() => {
    if (user) registerForPushNotifications();
  }, [user]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <Stack.Screen name="App" component={AppStack} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </QueryClientProvider>
  );
}
