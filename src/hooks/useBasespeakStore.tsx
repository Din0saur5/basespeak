import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppSettings, Avatar, Message, PersistedStore } from '~/types';
import { defaultStore, loadStore, saveStore } from '~/lib/storage';

interface BasespeakContextValue {
  store: PersistedStore;
  hydrated: boolean;
  actions: {
    replaceAvatars: (avatars: Avatar[]) => void;
    addAvatar: (avatar: Avatar) => void;
    addMessage: (avatarId: string, message: Message) => void;
    updateMessage: (avatarId: string, messageId: string, patch: Partial<Message>) => void;
    setMessages: (avatarId: string, messages: Message[]) => void;
    setSettings: (settings: Partial<AppSettings>) => void;
    reset: () => void;
  };
}

const BasespeakContext = createContext<BasespeakContextValue | undefined>(undefined);

function cloneDefaultStore(): PersistedStore {
  return {
    version: defaultStore.version,
    avatars: [...defaultStore.avatars],
    messages: { ...defaultStore.messages },
    settings: { ...defaultStore.settings },
  };
}

function normaliseMessage(message: Message): Message {
  const videoUrls = message.videoUrls ?? (message.videoUrl ? [message.videoUrl] : []);
  return {
    ...message,
    videoUrls,
    videoUrl: videoUrls[0] ?? message.videoUrl ?? null,
  };
}

export function BasespeakProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<PersistedStore>(cloneDefaultStore());
  const [hydrated, setHydrated] = useState<boolean>(false);

  useEffect(() => {
    loadStore().then((loaded) => {
      const normalisedMessages = Object.fromEntries(
        Object.entries(loaded.messages ?? {}).map(([key, value]) => [key, value.map(normaliseMessage)]),
      );
      setStore({
        ...loaded,
        messages: normalisedMessages,
      });
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    saveStore(store);
  }, [store, hydrated]);

  const updateStore = useCallback((updater: (prev: PersistedStore) => PersistedStore) => {
    setStore((prev) => {
      const next = updater(prev);
      return { ...next, version: prev.version };
    });
  }, []);

  const replaceAvatars = useCallback((avatars: Avatar[]) => {
    updateStore((prev) => ({ ...prev, avatars }));
  }, [updateStore]);

  const addAvatar = useCallback((avatar: Avatar) => {
    updateStore((prev) => {
      const exists = prev.avatars.some((item) => item.id === avatar.id);
      const avatars = exists
        ? prev.avatars.map((item) => (item.id === avatar.id ? avatar : item))
        : [avatar, ...prev.avatars];
      return { ...prev, avatars };
    });
  }, [updateStore]);

  const setMessages = useCallback((avatarId: string, messages: Message[]) => {
    updateStore((prev) => ({
      ...prev,
      messages: {
        ...prev.messages,
        [avatarId]: messages.map(normaliseMessage),
      },
    }));
  }, [updateStore]);

  const addMessage = useCallback((avatarId: string, message: Message) => {
    updateStore((prev) => {
      const current = prev.messages[avatarId] ?? [];
      const nextMessages = [...current, normaliseMessage(message)];
      return {
        ...prev,
        messages: {
          ...prev.messages,
          [avatarId]: nextMessages,
        },
      };
    });
  }, [updateStore]);

  const updateMessage = useCallback(
    (avatarId: string, messageId: string, patch: Partial<Message>) => {
      updateStore((prev) => {
        const current = prev.messages[avatarId] ?? [];
        const nextMessages = current.map((message) =>
          message.id === messageId ? normaliseMessage({ ...message, ...patch }) : message,
        );
        return {
          ...prev,
          messages: {
            ...prev.messages,
            [avatarId]: nextMessages,
          },
        };
      });
    },
    [updateStore],
  );

  const setSettings = useCallback((settings: Partial<AppSettings>) => {
    updateStore((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        ...settings,
      },
    }));
  }, [updateStore]);

  const reset = useCallback(() => {
    setStore(cloneDefaultStore());
  }, []);

  const value = useMemo<BasespeakContextValue>(() => ({
    store,
    hydrated,
    actions: {
      replaceAvatars,
      addAvatar,
      addMessage,
      updateMessage,
      setMessages,
      setSettings,
      reset,
    },
  }), [addAvatar, addMessage, hydrated, replaceAvatars, reset, setMessages, setSettings, store, updateMessage]);

  return <BasespeakContext.Provider value={value}>{children}</BasespeakContext.Provider>;
}

export function useBasespeakStore() {
  const context = useContext(BasespeakContext);
  if (!context) {
    throw new Error('useBasespeakStore must be used within BasespeakProvider');
  }
  return context;
}
