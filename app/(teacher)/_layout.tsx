import { Stack } from 'expo-router';

export default function TeacherLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="attendance" />
      <Stack.Screen name="students" />
      <Stack.Screen name="homework" />
      <Stack.Screen name="exams" />
      <Stack.Screen name="lesson" />
      <Stack.Screen name="timetable" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="incidents" />
      <Stack.Screen name="ai" />
      <Stack.Screen name="diary" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
