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
import { Avatar, LipsyncQuality, VoicePreset, VOICE_PRESETS } from '~/types';
import { VideoPane } from '~/components/VideoPane';

export interface PickedAsset {
  uri: string;
  mimeType: string;
  fileName: string;
  type: 'image' | 'video';
}

export interface AvatarFormSubmit {
  name: string;
  persona: string;
  voicePreset: VoicePreset;
  lipsyncQuality: LipsyncQuality;
  baseAsset: PickedAsset | null;
  idleAsset: PickedAsset | null;
  talkingAsset: PickedAsset | null;
}

interface AvatarFormProps {
  mode: 'create' | 'edit';
  initialAvatar?: Avatar;
  onSubmit: (values: AvatarFormSubmit) => Promise<void>;
  submitLabel?: string;
}

const DEFAULT_VOICE: VoicePreset = 'Friendly_Person';
const DEFAULT_QUALITY: LipsyncQuality = 'fast';

export function AvatarForm({ mode, initialAvatar, onSubmit, submitLabel }: AvatarFormProps) {
  const [baseAsset, setBaseAsset] = useState<PickedAsset | null>(null);
  const [idleAsset, setIdleAsset] = useState<PickedAsset | null>(null);
  const [talkingAsset, setTalkingAsset] = useState<PickedAsset | null>(null);
  const [name, setName] = useState<string>(initialAvatar?.name ?? '');
  const [voicePreset, setVoicePreset] = useState<VoicePreset>(initialAvatar?.voicePreset ?? DEFAULT_VOICE);
  const [persona, setPersona] = useState<string>(initialAvatar?.persona ?? '');
  const [quality, setQuality] = useState<LipsyncQuality>(initialAvatar?.lipsyncQuality ?? DEFAULT_QUALITY);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const effectiveBaseKind = baseAsset ? baseAsset.type : initialAvatar?.baseKind ?? null;
  const allowVariants = effectiveBaseKind === 'video';

  const basePreviewVideo =
    baseAsset?.type === 'video'
      ? baseAsset.uri
      : !baseAsset && initialAvatar?.baseKind === 'video'
        ? initialAvatar.talkingVideoUrl ?? initialAvatar.idleVideoUrl ?? initialAvatar.baseUrl ?? null
        : null;

  const basePreviewPoster =
    baseAsset?.type === 'image'
      ? baseAsset.uri
      : !baseAsset && initialAvatar?.baseKind === 'image'
        ? initialAvatar.baseUrl ?? initialAvatar.posterUrl ?? null
        : null;

  const idlePreviewUrl =
    idleAsset?.uri ?? (!baseAsset && initialAvatar?.idleVideoUrl ? initialAvatar.idleVideoUrl : null);
  const talkingPreviewUrl =
    talkingAsset?.uri ?? (!baseAsset && initialAvatar?.talkingVideoUrl ? initialAvatar.talkingVideoUrl : null);

  const handlePickBase = async () => {
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

    setBaseAsset({
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
    if (!name.trim()) {
      Alert.alert('Name required', 'Give your character a name.');
      return;
    }

    if (mode === 'create' && !baseAsset) {
      Alert.alert('Select a base', 'Pick an image or short video to continue.');
      return;
    }

    const payload: AvatarFormSubmit = {
      name: name.trim(),
      persona: persona.trim(),
      voicePreset,
      lipsyncQuality: quality,
      baseAsset,
      idleAsset,
      talkingAsset,
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } catch (error) {
      console.warn('Avatar form submission failed', error);
      const message =
        error instanceof Error && error.message ? error.message : 'Could not save avatar. Please try again.';
      Alert.alert('Save failed', message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitText = submitLabel ?? (mode === 'create' ? 'Create character' : 'Save changes');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={64}
      >
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.heading}>{mode === 'create' ? 'Upload Base' : 'Edit Character'}</Text>
          <TouchableOpacity style={styles.previewButton} onPress={handlePickBase} disabled={submitting}>
            <Text style={styles.previewButtonText}>
              {baseAsset ? 'Change File' : mode === 'create' ? 'Pick Image/Video' : 'Replace Base'}
            </Text>
          </TouchableOpacity>
          <View style={styles.previewWrapper}>
            <VideoPane
              videoUrl={basePreviewVideo ?? undefined}
              posterUrl={basePreviewPoster ?? undefined}
              fallbackLabel={mode === 'create' ? 'No base selected' : 'Using current base'}
            />
          </View>
          {baseAsset ? (
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>{baseAsset.fileName}</Text>
              <Text style={styles.fileMeta}>{baseAsset.mimeType}</Text>
            </View>
          ) : mode === 'edit' ? (
            <View style={styles.fileDetails}>
              <Text style={styles.fileName}>Using uploaded base</Text>
              <Text style={styles.fileMeta}>{initialAvatar?.baseMime ?? 'Unknown format'}</Text>
            </View>
          ) : null}

          {allowVariants ? (
            <View style={styles.videoVariants}>
              <Text style={styles.variantHeading}>Optional video variants</Text>
              <Text style={styles.variantHint}>
                Idle plays in the picker and while waiting on lipsync. Talking is sent to Gooey. If you skip one, we reuse
                the base video.
              </Text>

              <TouchableOpacity
                style={styles.variantButton}
                onPress={() => handlePickVideoVariant(setIdleAsset, 'idle')}
                disabled={submitting}
              >
                <Text style={styles.variantButtonText}>
                  {idleAsset ? 'Change Idle Clip' : idlePreviewUrl ? 'Replace Idle Clip' : 'Pick Idle Clip'}
                </Text>
              </TouchableOpacity>
              {idlePreviewUrl ? (
                <View style={styles.variantPreviewBlock}>
                  <VideoPane
                    videoUrl={idlePreviewUrl}
                    autoPlay
                    loop
                    muted
                    showControls={false}
                    fallbackLabel="Idle clip preview"
                  />
                  {idleAsset ? (
                    <View style={styles.fileDetailsCompact}>
                      <Text style={styles.fileName}>{idleAsset.fileName}</Text>
                      <Text style={styles.fileMeta}>{idleAsset.mimeType}</Text>
                    </View>
                  ) : (
                    <Text style={styles.existingMeta}>Existing idle clip</Text>
                  )}
                  {idleAsset ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setIdleAsset(null)}
                      disabled={submitting}
                    >
                      <Text style={styles.clearText}>Remove idle clip</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.variantButton}
                onPress={() => handlePickVideoVariant(setTalkingAsset, 'talking')}
                disabled={submitting}
              >
                <Text style={styles.variantButtonText}>
                  {talkingAsset ? 'Change Talking Clip' : talkingPreviewUrl ? 'Replace Talking Clip' : 'Pick Talking Clip'}
                </Text>
              </TouchableOpacity>
              {talkingPreviewUrl ? (
                <View style={styles.variantPreviewBlock}>
                  <VideoPane
                    videoUrl={talkingPreviewUrl}
                    autoPlay
                    loop
                    muted
                    showControls={false}
                    fallbackLabel="Talking clip preview"
                  />
                  {talkingAsset ? (
                    <View style={styles.fileDetailsCompact}>
                      <Text style={styles.fileName}>{talkingAsset.fileName}</Text>
                      <Text style={styles.fileMeta}>{talkingAsset.mimeType}</Text>
                    </View>
                  ) : (
                    <Text style={styles.existingMeta}>Existing talking clip</Text>
                  )}
                  {talkingAsset ? (
                    <TouchableOpacity
                      style={styles.clearButton}
                      onPress={() => setTalkingAsset(null)}
                      disabled={submitting}
                    >
                      <Text style={styles.clearText}>Remove talking clip</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
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
              editable={!submitting}
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
                    disabled={submitting}
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
              editable={!submitting}
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
                    disabled={submitting}
                  >
                    <Text style={[styles.qualityChipText, selected && styles.qualityChipTextSelected]}>
                      {option.toUpperCase()}
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
            <Text style={styles.submitButtonText}>{submitting ? 'Saving…' : submitText}</Text>
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
    paddingBottom: 32,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  previewButton: {
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  previewButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  previewWrapper: {
    marginBottom: 12,
  },
  fileDetails: {
    marginBottom: 20,
  },
  fileDetailsCompact: {
    marginTop: 8,
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
  },
  fileMeta: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  existingMeta: {
    marginTop: 8,
    fontSize: 13,
    color: '#64748b',
  },
  videoVariants: {
    marginBottom: 24,
  },
  variantHeading: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
  },
  variantHint: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  variantButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  variantButtonText: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '600',
  },
  variantPreviewBlock: {
    marginBottom: 16,
  },
  clearButton: {
    marginTop: 10,
    backgroundColor: '#fee2e2',
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  clearText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#0f172a',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 120,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#dbe2f1',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginHorizontal: 6,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  chipSelected: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  chipText: {
    fontSize: 13,
    color: '#1f2937',
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  qualityRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  qualityChip: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#fff',
  },
  qualityChipFirst: {
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  qualityChipSelected: {
    backgroundColor: '#1e293b',
    borderColor: '#1e293b',
  },
  qualityChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  qualityChipTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#2f80ed',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
