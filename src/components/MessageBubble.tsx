import { memo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Message } from '~/types';

interface MessageBubbleProps {
  message: Message;
}

function statusLabel(status: Message['status']): string | null {
  switch (status) {
    case 'rendering':
      return 'Rendering video…';
    case 'audio_ready':
      return 'Audio ready';
    case 'error':
      return 'Rendering failed';
    default:
      return null;
  }
}

function MessageBubbleComponent({ message }: MessageBubbleProps) {
  const isAssistant = message.role === 'assistant';
  const bubbleStyle = [styles.bubble, isAssistant ? styles.assistant : styles.user];
  const label = statusLabel(message.status);

  return (
    <View style={[styles.container, isAssistant ? styles.containerAssistant : styles.containerUser]}>
      <View style={bubbleStyle}>
        <Text style={[styles.text, isAssistant && styles.assistantText]}>{message.text}</Text>
        {label && (
          <View style={styles.statusRow}>
            {message.status === 'rendering' && <ActivityIndicator size="small" color="#2f80ed" />}
            <Text style={styles.statusText}>{label}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  containerUser: {
    alignItems: 'flex-end',
  },
  containerAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '82%',
    padding: 12,
    borderRadius: 20,
  },
  user: {
    backgroundColor: '#2f80ed',
    borderBottomRightRadius: 4,
  },
  assistant: {
    backgroundColor: '#f2f5fb',
    borderBottomLeftRadius: 4,
  },
  text: {
    fontSize: 16,
    color: '#fff',
  },
  assistantText: {
    color: '#1a1a1a',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 6,
  },
});

export const MessageBubble = memo(MessageBubbleComponent);
