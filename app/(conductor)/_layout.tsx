// Conductor layout
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function ConductorLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Boarding',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bus-clock"         size={size} color={color} /> }} />
      <Tabs.Screen name="incidents"options={{ title: 'Incidents', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-circle"      size={size} color={color} /> }} />
      <Tabs.Screen name="profile"  options={{ title: 'Profile',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle"    size={size} color={color} /> }} />
    </Tabs>
  );
}
