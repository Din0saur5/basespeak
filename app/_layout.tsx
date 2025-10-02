import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '~/hooks/useAuth';
import { BasespeakProvider } from '~/hooks/useBasespeakStore';

function AuthedStack() {
  return (
    <BasespeakProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="(modals)/upload-base"
          options={{ presentation: 'modal', title: 'Create Character', headerShown: true }}
        />
      </Stack>
    </BasespeakProvider>
  );
}

function AuthStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
    </Stack>
  );
}

function NavigationGate() {
  const { initializing, session } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return session ? <AuthedStack /> : <AuthStack />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <NavigationGate />
    </AuthProvider>
  );
}
