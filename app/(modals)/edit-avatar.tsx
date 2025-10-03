import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { AvatarForm, AvatarFormSubmit } from '~/components/AvatarForm';
import { updateAvatar } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';

export default function EditAvatarModal() {
  const router = useRouter();
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const { user } = useAuth();
  const {
    store: { avatars },
    actions: { addAvatar },
  } = useBasespeakStore();

  const avatar = avatars.find((item) => item.id === avatarId);

  const handleSubmit = async (values: AvatarFormSubmit) => {
    if (!user?.id) {
      throw new Error('Not signed in. Please try again.');
    }
    if (!avatarId) {
      throw new Error('Missing avatar id');
    }

    const response = await updateAvatar(
      avatarId,
      {
        name: values.name,
        voicePreset: values.voicePreset,
        persona: values.persona,
        lipsyncQuality: values.lipsyncQuality,
        base: values.baseAsset
          ? {
              uri: values.baseAsset.uri,
              fileName: values.baseAsset.fileName,
              mimeType: values.baseAsset.mimeType,
            }
          : undefined,
        idle: values.idleAsset
          ? {
              uri: values.idleAsset.uri,
              fileName: values.idleAsset.fileName,
              mimeType: values.idleAsset.mimeType,
            }
          : undefined,
        talking: values.talkingAsset
          ? {
              uri: values.talkingAsset.uri,
              fileName: values.talkingAsset.fileName,
              mimeType: values.talkingAsset.mimeType,
            }
          : undefined,
      },
      user.id,
    );

    addAvatar(response.avatar);
    router.back();
  };

  if (!avatar) {
    return (
      <SafeAreaView style={styles.fallback}>
        <View style={styles.fallbackCard}>
          <Text style={styles.fallbackTitle}>Avatar not found</Text>
          <Text style={styles.fallbackSubtitle}>Return to the characters tab and refresh, then try again.</Text>
          <Text style={styles.fallbackHint} onPress={() => router.back()}>
            Tap to close
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return <AvatarForm mode="edit" initialAvatar={avatar} onSubmit={handleSubmit} submitLabel="Save changes" />;
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  fallbackCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    alignItems: 'center',
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  fallbackSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  fallbackHint: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '600',
  },
});
