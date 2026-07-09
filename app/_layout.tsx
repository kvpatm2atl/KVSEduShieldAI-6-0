// Root layout — updated with splash routing
// Powered by OnSpace.AI

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AlertProvider } from '@/template';
import { AuthProvider } from '@/contexts/AuthContext';

export default function RootLayout() {
  return (
    <AlertProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="splash" />
            <Stack.Screen name="welcome" />
            <Stack.Screen name="index" />
            <Stack.Screen name="login" />
            <Stack.Screen name="pin" />
            <Stack.Screen name="(parent)" />
            <Stack.Screen name="(teacher)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="(conductor)" />
            <Stack.Screen name="(bus_driver)" />
            <Stack.Screen name="(security)" />
          </Stack>
        </AuthProvider>
      </SafeAreaProvider>
    </AlertProvider>
  );
}
