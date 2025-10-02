import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { fetchVendorStatus } from '~/lib/api';
import { useBasespeakStore } from '~/hooks/useBasespeakStore';
import { useAuth } from '~/hooks/useAuth';
import { VendorStatus } from '~/types';

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <View style={[styles.statusBadge, ok ? styles.statusOk : styles.statusError]}>
      <View style={[styles.dot, ok ? styles.dotOk : styles.dotError]} />
      <Text style={[styles.statusText, ok ? styles.statusTextOk : styles.statusTextError]}>{label}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const {
    store: { settings },
    hydrated,
    actions: { setSettings },
  } = useBasespeakStore();
  const { user, signOut } = useAuth();

  const [status, setStatus] = useState<VendorStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [signingOut, setSigningOut] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchVendorStatus();
        if (isMounted) {
          setStatus(response);
        }
      } catch (error) {
        console.warn('Failed to load vendor status', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await signOut();
    } catch (error) {
      console.warn('Failed to sign out', error);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.accountEmail}>{user?.email ?? 'Signed in'}</Text>
          <TouchableOpacity style={[styles.signOutButton, signingOut && styles.signOutDisabled]} onPress={handleSignOut} disabled={signingOut}>
            <Text style={styles.signOutText}>{signingOut ? 'Signing out…' : 'Sign out'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Vendor Keys</Text>
          {loading && !status ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator size="small" color="#2f80ed" />
              <Text style={styles.loaderText}>Checking vendor status…</Text>
            </View>
          ) : null}

          <View style={styles.statusRow}>
            <StatusBadge label="Supabase" ok={!!status?.supabase} />
            <StatusBadge label="Novita" ok={!!status?.novita} />
          </View>
          <View style={styles.statusRow}>
            <StatusBadge label="MiniMax TTS" ok={!!status?.minimax} />
            <StatusBadge label="Gooey" ok={!!status?.gooey} />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Chat preferences</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Clean mode</Text>
              <Text style={styles.toggleSubtitle}>Run outgoing messages through a basic profanity filter.</Text>
            </View>
            <Switch
              value={settings.cleanMode}
              onValueChange={(value) => setSettings({ cleanMode: value })}
              disabled={!hydrated}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Skip lipsync on short replies</Text>
              <Text style={styles.toggleSubtitle}>{'When replies are < 12 chars, keep it audio-only.'}</Text>
            </View>
            <Switch
              value={settings.skipShortReplies}
              onValueChange={(value) => setSettings({ skipShortReplies: value })}
              disabled={!hydrated}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    padding: 20,
    paddingBottom: 32,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  accountEmail: {
    fontSize: 15,
    color: '#1f2937',
    marginBottom: 16,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutDisabled: {
    opacity: 0.6,
  },
  signOutText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 15,
  },
  loaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  loaderText: {
    marginLeft: 8,
    color: '#475569',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  statusOk: {
    backgroundColor: '#e0f2fe',
  },
  statusError: {
    backgroundColor: '#fee2e2',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginRight: 6,
  },
  dotOk: {
    backgroundColor: '#2563eb',
  },
  dotError: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontWeight: '600',
    fontSize: 14,
  },
  statusTextOk: {
    color: '#1d4ed8',
  },
  statusTextError: {
    color: '#b91c1c',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  toggleCopy: {
    flex: 1,
    marginRight: 12,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  toggleSubtitle: {
    fontSize: 14,
    color: '#64748b',
  },
});