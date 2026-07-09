// Admin layout — all tabs including library and emergency
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function AdminLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#7C3AED',
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700' },
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 2,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen name="index"     options={{ title: 'Overview',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard-variant" size={size} color={color} /> }} />
      <Tabs.Screen name="students"  options={{ title: 'Students',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group"           size={size} color={color} /> }} />
      <Tabs.Screen name="teachers"  options={{ title: 'Teachers',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-tie"              size={size} color={color} /> }} />
      <Tabs.Screen name="timetable" options={{ title: 'Timetable', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timetable"                size={size} color={color} /> }} />
      <Tabs.Screen name="fleet"     options={{ title: 'Fleet',     tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bus-multiple"              size={size} color={color} /> }} />
      <Tabs.Screen name="pickup"    options={{ title: 'Pickup',    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-arrow-right"      size={size} color={color} /> }} />
      <Tabs.Screen name="incidents" options={{ title: 'Incidents', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-circle"              size={size} color={color} /> }} />
      <Tabs.Screen name="notices"   options={{ title: 'Notices',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bullhorn"                  size={size} color={color} /> }} />
      <Tabs.Screen name="library"   options={{ title: 'Library',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bookshelf"                 size={size} color={color} /> }} />
      <Tabs.Screen name="security"  options={{ title: 'Security',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-star"              size={size} color={color} /> }} />
      <Tabs.Screen name="analytics" options={{ title: 'Analytics', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-bar"                 size={size} color={color} /> }} />
      <Tabs.Screen name="ai"        options={{ title: 'AI',        tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain"                     size={size} color={color} /> }} />
      <Tabs.Screen name="emergency" options={{ title: 'Alerts',    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-circle"              size={size} color={color} /> }} />
      <Tabs.Screen name="profile"   options={{ title: 'Profile',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle"            size={size} color={color} /> }} />
    </Tabs>
  );
}
