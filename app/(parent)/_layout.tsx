// Parent tab layout — added AI Assistant tab
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function ParentLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
        tabBarStyle: {
          height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
          paddingTop: 8,
          paddingBottom: Platform.select({ ios: insets.bottom + 8, android: insets.bottom + 8, default: 8 }),
          paddingHorizontal: 4,
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
        },
      }}
    >
      <Tabs.Screen name="index"      options={{ title: 'Feed',       tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timeline-text"    size={size} color={color} /> }} />
      <Tabs.Screen name="safety"     options={{ title: 'Safety',     tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="bus-clock"        size={size} color={color} /> }} />
      <Tabs.Screen name="academic"   options={{ title: 'Academic',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-education"   size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="calendar-check"   size={size} color={color} /> }} />
      <Tabs.Screen name="timetable"  options={{ title: 'Timetable',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timetable"        size={size} color={color} /> }} />
      <Tabs.Screen name="assistant"  options={{ title: 'AI',         tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain"            size={size} color={color} /> }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle"   size={size} color={color} /> }} />
    </Tabs>
  );
}
