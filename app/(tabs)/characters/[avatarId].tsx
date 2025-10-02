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
import { fetchMessages, pollJob, sendReply } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';
import { generateId } from '~/lib/id';
import { Message } from '~/types';

export default function ChatScreen() {
  const { avatarId } = useLocalSearchParams<{ avatarId: string }>();
  const navigation = useNavigation();
  const { user } = useAuth();
  const {
    store: { avatars, messages: messageMap, settings },
    hydrated,
    actions: { addMessage, updateMessage, setMessages },
  } = useBasespeakStore();

  const avatar = useMemo(() => avatars.find((item) => item.id === avatarId), [avatars, avatarId]);
  const messages = messageMap[avatarId ?? ''] ?? [];

  const [input, setInput] = useState<string>('');
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const listRef = useRef<FlatList<Message>>(null);
  const jobTrackers = useRef<Map<string, () => void>>(new Map());

  const trackJob = useCallback(
    (jobId: string, messageId: string, currentAvatarId: string, userId?: string | null) => {
      if (jobTrackers.current.has(jobId)) {
        return;
      }

      let cancelled = false;
      let timeout: ReturnType<typeof setTimeout> | null = null;

      const cancel = () => {
        cancelled = true;
        if (timeout) {
          clearTimeout(timeout);
        }
      };

      const pollLoop = async (attempt = 0) => {
        if (cancelled) {
          return;
        }
        try {
          const result = await pollJob(jobId, userId ?? undefined);
          console.log('[Gooey] poll result', jobId, result.status, {
            mp4Url: result.mp4Url,
            messageId: result.messageId,
          });
          if (cancelled) {
            return;
          }

          if (result.status === 'done' && result.mp4Url) {
            updateMessage(currentAvatarId, messageId, {
              status: 'done',
              videoUrl: result.mp4Url,
            });
            jobTrackers.current.delete(jobId);
            cancel();
            console.log('[Gooey] job complete', jobId, 'url:', result.mp4Url);
            return;
          }

          if (result.status === 'error') {
            updateMessage(currentAvatarId, messageId, {
              status: 'error',
            });
            jobTrackers.current.delete(jobId);
            cancel();
            console.warn('[Gooey] job error', jobId, result.error);
            return;
          }
        } catch (error) {
          console.warn('Job polling failed', error);
          if (attempt >= 10) {
            updateMessage(currentAvatarId, messageId, {
              status: 'error',
            });
            jobTrackers.current.delete(jobId);
            cancel();
            console.warn('[Gooey] job failed after retries', jobId);
            return;
          }
        }

        timeout = setTimeout(() => pollLoop(attempt + 1), 2000);
      };

      jobTrackers.current.set(jobId, cancel);
      pollLoop();
    },
    [updateMessage],
  );

  useEffect(() => {
    if (avatar) {
      navigation.setOptions({ title: avatar.name });
    }
  }, [avatar, navigation]);

  useEffect(() => {
    if (!avatarId) {
      return;
    }
    console.log('[Chat] avatar snapshot', {
      avatarId,
      baseKind: avatar?.baseKind,
      baseUrl: avatar?.baseUrl,
      posterUrl: avatar?.posterUrl,
    });
  }, [avatarId, avatar?.baseKind, avatar?.baseUrl, avatar?.posterUrl]);

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
    };
  }, [avatarId, hydrated, setMessages, user?.id]);

  useEffect(() => {
    if (!avatarId) {
      return;
    }
    messages.forEach((message) => {
      if (message.jobId && message.status === 'rendering' && !jobTrackers.current.has(message.jobId)) {
        trackJob(message.jobId, message.id, avatarId, user?.id);
      }
    });
  }, [avatarId, messages, trackJob, user?.id]);

  useEffect(() => {
    if (messages.length) {
      const timeout = setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [messages]);

  useEffect(() => {
    return () => {
      jobTrackers.current.forEach((cancel) => cancel());
      jobTrackers.current.clear();
    };
  }, []);

  const latestVideo = useMemo(() => {
    const reversed = [...messages].reverse();
    const withVideo = reversed.find((message) => message.videoUrl);
    return withVideo?.videoUrl ?? null;
  }, [messages]);

  useEffect(() => {
    console.log('[Chat] latest video updated', latestVideo);
  }, [latestVideo]);

  const fallbackVideo = avatar?.baseKind === 'video' ? avatar?.baseUrl ?? null : null;
  const fallbackPoster = avatar?.baseKind === 'image' ? avatar?.baseUrl : avatar?.posterUrl ?? null;

  useEffect(() => {
    console.log('[Chat] fallback assets', { fallbackVideo, fallbackPoster });
  }, [fallbackPoster, fallbackVideo]);

  const isFallbackVideo = Boolean(fallbackVideo) && !latestVideo;
  const videoToDisplay = latestVideo ?? fallbackVideo;
  const posterToDisplay = latestVideo ? undefined : fallbackPoster;

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
      createdAt: now,
    };

    addMessage(avatarId, userMessage);
    setInput('');

    try {
      setSending(true);
      const reply = await sendReply({
        avatarId,
        userText: text,
        lipsyncQuality: avatar.lipsyncQuality ?? 'fast',
        settings,
      }, user.id);

      const assistantMessage: Message = {
        id: reply.messageId ?? generateId('assistant'),
        avatarId,
        userId: user.id,
        role: 'assistant',
        text: reply.replyText,
        status: reply.jobId ? 'rendering' : 'audio_ready',
        jobId: reply.jobId ?? undefined,
        createdAt: new Date().toISOString(),
      };

      addMessage(avatarId, assistantMessage);

      playBase64Audio(reply.audioB64, reply.mime).catch((error) => {
        console.warn('Failed to play audio', error);
      });

      if (reply.jobId) {
        trackJob(reply.jobId, assistantMessage.id, avatarId, user.id);
      }
    } catch (error) {
      console.warn('Failed to send reply', error);
      Alert.alert('Reply failed', 'Something went wrong. Please try again.');
    } finally {
      setSending(false);
    }
  }, [addMessage, avatar, avatarId, input, settings, trackJob, user?.id]);

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
            videoUrl={videoToDisplay}
            posterUrl={posterToDisplay}
            autoPlay={isFallbackVideo}
            loop={isFallbackVideo}
            muted={isFallbackVideo}
            showControls={!isFallbackVideo}
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
            renderItem={({ item }) => <MessageBubble message={item} />}
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
