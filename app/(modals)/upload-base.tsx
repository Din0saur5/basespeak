import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { VideoPane } from '~/components/VideoPane';
import { uploadBase } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';
import { LipsyncQuality, VoicePreset, VOICE_PRESETS } from '~/types';

interface PickedAsset {
  uri: string;
  mimeType: string;
  fileName: string;
  type: 'image' | 'video';
}

const DEFAULT_VOICE: VoicePreset = 'Friendly_Person';
const DEFAULT_QUALITY: LipsyncQuality = 'fast';

export default function UploadBaseModal() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    actions: { addAvatar },
  } = useBasespeakStore();

  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [idleAsset, setIdleAsset] = useState<PickedAsset | null>(null);
  const [talkingAsset, setTalkingAsset] = useState<PickedAsset | null>(null);
  const [name, setName] = useState<string>('');
  const [voicePreset, setVoicePreset] = useState<VoicePreset>(DEFAULT_VOICE);
  const [persona, setPersona] = useState<string>('');
  const [quality, setQuality] = useState<LipsyncQuality>(DEFAULT_QUALITY);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handlePick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: false,
      quality: 0.9,
      videoMaxDuration: 10,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const picked = result.assets[0];
    if (!picked.uri || !picked.mimeType) {
      Alert.alert('Could not read file info', 'Please try again with a different file.');
      return;
    }

    const fileName = picked.fileName ?? picked.uri.split('/').pop() ?? `upload-${Date.now()}`;
    const type = picked.type === 'video' ? 'video' : 'image';

    setAsset({
      uri: picked.uri,
      mimeType: picked.mimeType,
      fileName,
      type,
    });

    if (type !== 'video') {
      setIdleAsset(null);
      setTalkingAsset(null);
    }
  };

  const handlePickVideoVariant = async (
    setter: (asset: PickedAsset | null) => void,
    label: string,
  ) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: false,
      quality: 1,
      videoMaxDuration: 10,
    });

    if (result.canceled || !result.assets?.length) {
      return;
    }

    const picked = result.assets[0];
    if (!picked.uri || !picked.mimeType) {
      Alert.alert('Could not read file info', `Please try again with a different ${label} clip.`);
      return;
    }

    const fileName = picked.fileName ?? picked.uri.split('/').pop() ?? `${label}-${Date.now()}.mp4`;
    setter({
      uri: picked.uri,
      mimeType: picked.mimeType,
      fileName,
      type: 'video',
    });
  };

  const handleSubmit = async () => {
    if (!asset) {
      Alert.alert('Select a base', 'Pick an image or short video to continue.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Name required', 'Give your character a name.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Not signed in', 'Your session expired. Please sign in again.');
      return;
    }

    try {
      setSubmitting(true);
      const payloadIdle = asset.type === 'video' ? idleAsset ?? asset : null;
      const payloadTalking = asset.type === 'video' ? talkingAsset ?? asset : null;
      const response = await uploadBase({
        uri: asset.uri,
        fileName: asset.fileName,
        mimeType: asset.mimeType,
        name: name.trim(),
        voicePreset,
        persona: persona.trim() || undefined,
        lipsyncQuality: quality,
        idle: payloadIdle
          ? {
              uri: payloadIdle.uri,
              fileName: payloadIdle.fileName,
              mimeType: payloadIdle.mimeType,
            }
          : null,
        talking: payloadTalking
          ? {
              uri: payloadTalking.uri,
              fileName: payloadTalking.fileName,
              mimeType: payloadTalking.mimeType,
            }
          : null,
      }, user.id);
      addAvatar(response.avatar);
      router.back();
    } catch (error) {
      console.warn('Failed to upload base', error);
      Alert.alert('Upload failed', 'Could not create character. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>Upload Base</Text>
          <TouchableOpacity style={styles.previewButton} onPress={handlePick}>
            <Text style={styles.previewButtonText}>{asset ? 'Change File' : 'Pick Image/Video'}</Text>
          </TouchableOpacity>
          <View style={styles.previewWrapper}>
            <VideoPane
              videoUrl={asset?.type === 'video' ? asset.uri : undefined}
              posterUrl={asset?.type === 'image' ? asset.uri : undefined}
              fallbackLabel="No base selected"
            />
          </View>
          {asset && (
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{asset.fileName}</Text>
              <Text style={styles.fileMeta}>{asset.mimeType}</Text>
            </View>
          )}

          {asset?.type === 'video' ? (
            <View style={styles.videoVariants}>
              <Text style={styles.variantHeading}>Optional video variants</Text>
              <Text style={styles.variantHint}>
                Idle plays in the picker and while waiting on lipsync. Talking is sent to Gooey. If you skip one, we
                reuse the base video.
              </Text>

              <TouchableOpacity
                style={styles.variantButton}
                onPress={() => handlePickVideoVariant(setIdleAsset, 'idle')}
                disabled={submitting}
              >
                <Text style={styles.variantButtonText}>{idleAsset ? 'Change Idle Clip' : 'Pick Idle Clip'}</Text>
              </TouchableOpacity>
              {idleAsset && (
                <View style={styles.variantPreviewBlock}>
                  <VideoPane
                    videoUrl={idleAsset.uri}
                    autoPlay
                    loop
                    muted
                    showControls={false}
                    fallbackLabel="Idle clip preview"
                  />
                  <View style={styles.fileDetailsCompact}>
                    <Text style={styles.fileName}>{idleAsset.fileName}</Text>
                    <Text style={styles.fileMeta}>{idleAsset.mimeType}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setIdleAsset(null)}
                    disabled={submitting}
                  >
                    <Text style={styles.clearText}>Remove idle clip</Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.variantButton}
                onPress={() => handlePickVideoVariant(setTalkingAsset, 'talking')}
                disabled={submitting}
              >
                <Text style={styles.variantButtonText}>{talkingAsset ? 'Change Talking Clip' : 'Pick Talking Clip'}</Text>
              </TouchableOpacity>
              {talkingAsset && (
                <View style={styles.variantPreviewBlock}>
                  <VideoPane
                    videoUrl={talkingAsset.uri}
                    autoPlay
                    loop
                    muted
                    showControls={false}
                    fallbackLabel="Talking clip preview"
                  />
                  <View style={styles.fileDetailsCompact}>
                    <Text style={styles.fileName}>{talkingAsset.fileName}</Text>
                    <Text style={styles.fileMeta}>{talkingAsset.mimeType}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => setTalkingAsset(null)}
                    disabled={submitting}
                  >
                    <Text style={styles.clearText}>Remove talking clip</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Give your avatar a memorable name"
              placeholderTextColor="#9ca3af"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Voice preset</Text>
            <View style={styles.chipContainer}>
              {VOICE_PRESETS.map((preset) => {
                const selected = preset === voicePreset;
                return (
                  <TouchableOpacity
                    key={preset}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setVoicePreset(preset)}
                  >
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{preset}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Persona</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="System prompt for Novita (optional)"
              placeholderTextColor="#9ca3af"
              value={persona}
              onChangeText={setPersona}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Lipsync quality</Text>
            <View style={styles.qualityRow}>
              {(['fast', 'hd'] as LipsyncQuality[]).map((option, index) => {
                const selected = option === quality;
                return (
                  <TouchableOpacity
                    key={option}
                    style={[
                      styles.qualityChip,
                      selected && styles.qualityChipSelected,
                      index === 0 && styles.qualityChipFirst,
                    ]}
                    onPress={() => setQuality(option)}
                  >
                    <Text style={[styles.qualityText, selected && styles.qualityTextSelected]}>
                      {option === 'fast' ? 'Fast (default)' : 'HD'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitText}>{submitting ? 'Creating…' : 'Create Character'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  flex: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  previewButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#2f80ed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    marginBottom: 16,
  },
  previewButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  previewWrapper: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  fileDetails: {
    marginBottom: 20,
  },
  fileDetailsCompact: {
    marginTop: 12,
    marginBottom: 8,
  },
  fileName: {
    fontWeight: '600',
    color: '#1f2937',
  },
  fileMeta: {
    color: '#6b7280',
  },
  videoVariants: {
    marginBottom: 24,
    backgroundColor: '#f1f5f9',
    padding: 16,
    borderRadius: 12,
  },
  variantHeading: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 6,
  },
  variantHint: {
    color: '#475569',
    fontSize: 13,
    marginBottom: 12,
  },
  variantButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  variantButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  variantPreviewBlock: {
    marginBottom: 16,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  clearButton: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  clearText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 120,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#2f80ed',
  },
  chipText: {
    color: '#1f2937',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
  },
  qualityChip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5f5',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  qualityChipFirst: {
    marginRight: 12,
  },
  qualityChipSelected: {
    backgroundColor: '#2f80ed',
    borderColor: '#2f80ed',
  },
  qualityText: {
    color: '#1f2937',
    fontWeight: '500',
  },
  qualityTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    alignItems: 'center',
  },
  cancelText: {
    color: '#6b7280',
    fontSize: 15,
  },
});
