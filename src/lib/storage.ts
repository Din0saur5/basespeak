import AsyncStorage from '@react-native-async-storage/async-storage';
import { PersistedStore } from '~/types';

const STORE_KEY = 'basespeak::store.v1';
const CURRENT_VERSION = 1;

export const defaultStore: PersistedStore = {
  version: CURRENT_VERSION,
  avatars: [],
  messages: {},
  settings: {
    cleanMode: true,
    skipShortReplies: true,
  },
};

export async function loadStore(): Promise<PersistedStore> {
  try {
    const raw = await AsyncStorage.getItem(STORE_KEY);
    if (!raw) {
      return defaultStore;
    }
    const parsed = JSON.parse(raw) as PersistedStore;
    if (!parsed.version || parsed.version < CURRENT_VERSION) {
      return { ...defaultStore, ...parsed, version: CURRENT_VERSION };
    }
    return parsed;
  } catch (error) {
    console.warn('Failed to load store from AsyncStorage', error);
    return defaultStore;
  }
}

export async function saveStore(store: PersistedStore): Promise<void> {
  try {
    const payload = JSON.stringify({ ...store, version: CURRENT_VERSION });
    await AsyncStorage.setItem(STORE_KEY, payload);
  } catch (error) {
    console.warn('Failed to persist store', error);
  }
}

export async function clearStore(): Promise<void> {
  await AsyncStorage.removeItem(STORE_KEY);
}
