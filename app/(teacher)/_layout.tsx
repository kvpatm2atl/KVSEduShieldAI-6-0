// Teacher layout — added students management tab
// Powered by OnSpace.AI

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function TeacherLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
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
      <Tabs.Screen name="index"      options={{ title: 'Today',      tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="view-dashboard"     size={size} color={color} /> }} />
      <Tabs.Screen name="attendance" options={{ title: 'Attendance', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-check"    size={size} color={color} /> }} />
      <Tabs.Screen name="students"   options={{ title: 'Students',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-group"      size={size} color={color} /> }} />
      <Tabs.Screen name="homework"   options={{ title: 'Homework',   tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-text"     size={size} color={color} /> }} />
      <Tabs.Screen name="exams"      options={{ title: 'Exams',      tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="clipboard-list"     size={size} color={color} /> }} />
      <Tabs.Screen name="lesson"     options={{ title: 'Lesson',     tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="book-edit"          size={size} color={color} /> }} />
      <Tabs.Screen name="timetable"  options={{ title: 'Timetable',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="timetable"          size={size} color={color} /> }} />
      <Tabs.Screen name="analytics"  options={{ title: 'Analytics',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-bar"          size={size} color={color} /> }} />
      <Tabs.Screen name="incidents"  options={{ title: 'Incidents',  tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="alert-circle"       size={size} color={color} /> }} />
      <Tabs.Screen name="ai"         options={{ title: 'AI',         tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="brain"              size={size} color={color} /> }} />
      <Tabs.Screen name="profile"    options={{ title: 'Profile',    tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="account-circle"     size={size} color={color} /> }} />
    </Tabs>
  );
}
