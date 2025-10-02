import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '~/hooks/useAuth';

export default function Index() {
  const { initializing, session } = useAuth();

  if (initializing) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#2f80ed" />
      </View>
    );
  }

  return session ? <Redirect href="/(tabs)/characters" /> : <Redirect href="/(auth)/sign-in" />;
}
