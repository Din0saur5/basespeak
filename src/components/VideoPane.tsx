import { useCallback } from 'react';
import { Video, ResizeMode } from 'expo-av';
import { Image, StyleSheet, Text, View } from 'react-native';

interface VideoPaneProps {
  videoUrl?: string | null;
  posterUrl?: string | null;
  fallbackLabel?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  showControls?: boolean;
  aspectRatio?: number;
  onEnd?: () => void;
  playKey?: string;
}

export function VideoPane({
  videoUrl,
  posterUrl,
  fallbackLabel = 'No video yet',
  autoPlay = false,
  loop = false,
  muted = false,
  showControls = true,
  aspectRatio = 16 / 9,
  onEnd,
  playKey,
}: VideoPaneProps) {
  const videoStyle = [styles.video, { aspectRatio }];
  const key = playKey ?? videoUrl ?? posterUrl ?? fallbackLabel;
  const handleStatusUpdate = useCallback(
    (status: unknown) => {
      if (!onEnd) {
        return;
      }
      const typed = status as { didJustFinish?: boolean };
      if (typed?.didJustFinish) {
        onEnd();
      }
    },
    [onEnd],
  );

  if (videoUrl) {
    return (
      <Video
        key={key}
        style={videoStyle}
        source={{ uri: videoUrl }}
        useNativeControls={showControls}
        resizeMode={showControls ? ResizeMode.CONTAIN : ResizeMode.COVER}
        shouldPlay={autoPlay}
        isLooping={loop}
        isMuted={muted}
        onPlaybackStatusUpdate={handleStatusUpdate}
      />
    );
  }

  if (posterUrl) {
    return <Image key={key} source={{ uri: posterUrl }} style={videoStyle} resizeMode="cover" />;
  }

  return (
    <View key={key} style={[videoStyle, styles.placeholder]}>
      <Text style={styles.placeholderText}>{fallbackLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  video: {
    width: '100%',
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
