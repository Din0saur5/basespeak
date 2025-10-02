import { memo } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { VideoPane } from '~/components/VideoPane';
import { Avatar } from '~/types';

interface AvatarCardProps {
  avatar: Avatar;
  onPress?: () => void;
}

function AvatarCardComponent({ avatar, onPress }: AvatarCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.previewWrapper}>
        {avatar.baseKind === 'video' ? (
          <VideoPane
            videoUrl={avatar.baseUrl}
            posterUrl={avatar.posterUrl ?? undefined}
            autoPlay
            loop
            muted
            showControls={false}
            fallbackLabel="No preview"
          />
        ) : (
          <Image source={{ uri: avatar.baseUrl }} style={styles.preview} resizeMode="cover" />
        )}
      </View>
      <Text style={styles.name} numberOfLines={1}>
        {avatar.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    maxWidth: '48%',
    borderRadius: 12,
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 16,
    marginHorizontal: '1%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  previewWrapper: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#e9eef5',
    marginBottom: 8,
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

export const AvatarCard = memo(AvatarCardComponent);
