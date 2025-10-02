import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

function mimeToExtension(mime?: string): string {
  switch (mime) {
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    default:
      return 'mp3';
  }
}

export async function playBase64Audio(base64: string, mime?: string) {
  if (!base64) {
    return;
  }

  const extension = mimeToExtension(mime);
  const fileUri = `${FileSystem.cacheDirectory}basespeak-${Date.now()}.${extension}`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const { sound } = await Audio.Sound.createAsync({ uri: fileUri });
  const unload = async () => {
    try {
      await sound.unloadAsync();
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (error) {
      console.warn('Failed to clean audio resources', error);
    }
  };

  sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      return;
    }
    if (status.didJustFinish) {
      unload();
    }
  });

  await sound.playAsync();
}
