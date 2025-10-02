import { Video, ResizeMode } from 'expo-av';
import { Image, StyleSheet, Text, View } from 'react-native';

interface VideoPaneProps {
  videoUrl?: string | null;
  posterUrl?: string | null;
  fallbackLabel?: string;
}

export function VideoPane({ videoUrl, posterUrl, fallbackLabel = 'No video yet' }: VideoPaneProps) {
  if (videoUrl) {
    return (
      <Video
        style={styles.video}
        source={{ uri: videoUrl }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay={false}
      />
    );
  }

  if (posterUrl) {
    return <Image source={{ uri: posterUrl }} style={styles.video} resizeMode="cover" />;
  }

  return (
    <View style={[styles.video, styles.placeholder]}>
      <Text style={styles.placeholderText}>{fallbackLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 12,
    backgroundColor: '#0f172a',
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 14,
  },
});
