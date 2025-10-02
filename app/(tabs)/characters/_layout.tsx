import { Stack } from 'expo-router';

export default function CharactersLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[avatarId]" options={{ title: 'Chat' }} />
    </Stack>
  );
}
