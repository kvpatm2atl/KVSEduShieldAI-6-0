import { Stack } from 'expo-router';

export default function ParentLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="safety" />
      <Stack.Screen name="academic" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="assistant" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
