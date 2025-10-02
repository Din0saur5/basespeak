import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '~/hooks/useAuth';
import { BasespeakProvider } from '~/hooks/useBasespeakStore';

function RootNavigator() {
  const { initializing } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="(modals)/upload-base"
        options={{ presentation: 'modal', title: 'Create Character', headerShown: true }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <BasespeakProvider>
        <RootNavigator />
      </BasespeakProvider>
    </AuthProvider>
  );
}
