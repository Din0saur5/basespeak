import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { AvatarCard } from '~/components/AvatarCard';
import { fetchAvatars } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';

export default function CharactersScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    store: { avatars },
    hydrated,
    actions: { replaceAvatars },
  } = useBasespeakStore();
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadAvatars = useCallback(async () => {
    try {
      if (!hydrated || !user?.id) {
        return;
      }
      setLoading(true);
      const remoteAvatars = await fetchAvatars(user.id);
      replaceAvatars(remoteAvatars);
    } catch (error) {
      console.warn('Failed to fetch avatars', error);
    } finally {
      setLoading(false);
    }
  }, [hydrated, replaceAvatars, user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!hydrated || !user?.id) {
        return;
      }
      loadAvatars();
    }, [hydrated, loadAvatars, user?.id]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAvatars();
    } finally {
      setRefreshing(false);
    }
  }, [loadAvatars]);

  const content = useMemo(() => {
    if (!hydrated && !avatars.length) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2f80ed" />
        </View>
      );
    }

    if (!avatars.length) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>No characters yet</Text>
          <Text style={styles.emptySubtitle}>Create your first avatar to start chatting.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={avatars}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderItem={({ item }) => (
          <AvatarCard
            avatar={item}
            onPress={() => router.push({ pathname: '/(tabs)/characters/[avatarId]', params: { avatarId: item.id } })}
          />
        )}
        contentContainerStyle={styles.gridContent}
      />
    );
  }, [avatars, hydrated, onRefresh, refreshing, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Characters</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(modals)/upload-base')}>
          <Text style={styles.createButtonText}>New Character</Text>
        </TouchableOpacity>
      </View>
      {loading && !!avatars.length ? (
        <View style={styles.loadingBanner}>
          <ActivityIndicator size="small" color="#2f80ed" />
          <Text style={styles.loadingText}>Syncing latest characters…</Text>
        </View>
      ) : null}
      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  createButton: {
    backgroundColor: '#2f80ed',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#e8f1ff',
  },
  loadingText: {
    marginLeft: 8,
    color: '#2f80ed',
    fontSize: 13,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  gridContent: {
    paddingBottom: 24,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
  },
});
