import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MessageBubble } from '~/components/MessageBubble';
import { VideoPane } from '~/components/VideoPane';
import { playBase64Audio } from '~/lib/audio';
import { fetchMessages, sendReply } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';
import { generateId } from '~/lib/id';
import { Message } from '~/types';

type ActivePlayback = {
  messageId: string;
  urls: string[];
  index: number;
};

export default function ChatScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    store: { avatars, messages: messageMap, settings },
    hydrated,
    actions: { addMessage, setMessages },
  } = useBasespeakStore();

  const avatar = useMemo(() => avatars.find((item) => item.id === avatarId), [avatars, avatarId]);
  const messages = messageMap[avatarId ?? ''] ?? [];

  const [input, setInput] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [activePlayback, setActivePlayback] = useState<ActivePlayback | null>(null);

  const listRef = useRef<FlatList<Message>>(null);

  useEffect(() => {
    if (avatar) {
      navigation.setOptions({ title: avatar.name });
    }
  }, [avatar, navigation]);

  useEffect(() => {
    if (!avatarId || !hydrated || !user?.id) {
      return;
    }

    let isMounted = true;
    const load = async () => {
      try {
        setLoadingHistory(true);
        const remoteMessages = await fetchMessages(user.id, avatarId);
        if (isMounted) {
          setMessages(avatarId, remoteMessages);
        }
      } catch (error) {
        console.warn('Failed to load messages', error);
      } finally {
        if (isMounted) {
          setLoadingHistory(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
      setActivePlayback(null);
    };
  }, [avatarId, hydrated, setMessages, user?.id]);

  useEffect(() => {
    if (messages.length) {
      const timeout = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  const fallbackVideo =
    avatar?.baseKind === 'video'
      ? avatar?.idleVideoUrl ?? avatar?.baseUrl ?? null
      : null;
  const fallbackPoster = avatar?.baseKind === 'image' ? avatar?.baseUrl : avatar?.posterUrl ?? null;

  const hasActiveVideo = Boolean(activePlayback?.urls?.length);
  const currentVideoUrl = hasActiveVideo ? activePlayback!.urls[activePlayback!.index] : fallbackVideo;
  const playKey = hasActiveVideo
    ? `${activePlayback!.messageId}-${activePlayback!.index}`
    : `idle-${fallbackVideo ?? 'none'}`;

  const handleVideoEnd = useCallback(() => {
    setActivePlayback((current) => {
      if (!current) {
        return null;
      }
      const nextIndex = current.index + 1;
      if (nextIndex < current.urls.length) {
        return { ...current, index: nextIndex };
      }
      return null;
    });
  }, []);

  const handleReplay = useCallback((message: Message) => {
    const urls = message.videoUrls ?? (message.videoUrl ? [message.videoUrl] : []);
    if (!urls.length) {
      return;
    }
    setActivePlayback({ messageId: message.id, urls, index: 0 });
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!avatarId || !avatar || !text || !user?.id) {
      return;
    }

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: generateId('user'),
      avatarId,
      userId: user.id,
      role: 'user',
      text,
      status: 'done',
      videoUrls: [],
      createdAt: now,
    };

    addMessage(avatarId, userMessage);
    setInput('');
    setActivePlayback(null);

    try {
      setSending(true);
      const reply = await sendReply({
        avatarId,
        userText: text,
        lipsyncQuality: avatar.lipsyncQuality ?? 'fast',
        settings,
      }, user.id);

      const videoUrls = reply.videoUrls ?? [];
      const status = videoUrls.length ? 'done' : 'audio_ready';
      const assistantMessage: Message = {
        id: reply.messageId ?? generateId('assistant'),
        avatarId,
        userId: user.id,
        role: 'assistant',
        text: reply.replyText,
        status,
        videoUrls,
        videoUrl: videoUrls[0] ?? null,
        createdAt: new Date().toISOString(),
      };

      addMessage(avatarId, assistantMessage);

      if (videoUrls.length) {
        setActivePlayback({ messageId: assistantMessage.id, urls: videoUrls, index: 0 });
      } else {
        playBase64Audio(reply.audioB64, reply.mime).catch((error) => {
          console.warn('Failed to play fallback audio', error);
        });
      }
    } catch (error) {
      console.warn('Failed to send reply', error);
      Alert.alert('Reply failed', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }, [addMessage, avatar, avatarId, input, settings, user?.id]);

  if (!avatar) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.centeredText}>Avatar not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <View style={styles.videoContainer}>
          <VideoPane
            videoUrl={currentVideoUrl ?? undefined}
            posterUrl={hasActiveVideo ? undefined : fallbackPoster}
            autoPlay={Boolean(currentVideoUrl)}
            loop={!hasActiveVideo}
            muted={!hasActiveVideo}
            showControls={false}
            onEnd={hasActiveVideo ? handleVideoEnd : undefined}
            playKey={playKey}
            fallbackLabel="Waiting for first lipsync video"
          />
        </View>

        {loadingHistory && !messages.length ? (
          <View style={styles.loadingHistory}>
            <ActivityIndicator size="large" color="#2f80ed" />
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <MessageBubble
                message={item}
                onReplay={item.videoUrls && item.videoUrls.length > 0 ? () => handleReplay(item) : undefined}
              />
            )}
            contentContainerStyle={styles.messagesContent}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Say something…"
            placeholderTextColor="#94a3b8"
            value={input}
            onChangeText={setInput}
            editable={!sending}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, (!input.trim() || sending) && styles.sendButtonDisabled]}
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendText}>{sending ? 'Sending…' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
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
  videoContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centeredText: {
    color: '#64748b',
    fontSize: 16,
  },
  loadingHistory: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messagesContent: {
    paddingTop: 16,
    paddingBottom: 20,
  },
  composer: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#dbe2f1',
    backgroundColor: '#fff',
  },
  input: {
    minHeight: 48,
    maxHeight: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2f1',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    fontSize: 16,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  sendButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#2f80ed',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendText: {
    color: '#fff',
    fontWeight: '600',
  },
});
