import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '~/hooks/useAuth';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, session } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/characters');
    }
  }, [session, router]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError('Enter your email and password.');
      setInfo(null);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setInfo(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setInfo(null);
      await signUp(trimmedEmail, password);
      setInfo('Check your email to confirm the account, then sign in.');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <View style={styles.container}>
          <Text style={styles.title}>Create an account</Text>
          <Text style={styles.subtitle}>Start building your BaseSpeak characters.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Confirm password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {info ? <Text style={styles.info}>{info}</Text> : null}

          <TouchableOpacity style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.primaryText}>{loading ? 'Signing up…' : 'Create Account'}</Text>
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already a member?</Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/sign-in')}>
              <Text style={styles.linkText}>Log in</Text>
            </TouchableOpacity>
          </View>
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
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 32,
  },
  fieldGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5f5',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: '#0f172a',
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
    marginBottom: 16,
    fontSize: 14,
  },
  info: {
    color: '#1d4ed8',
    marginBottom: 16,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: '#2f80ed',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  footerText: {
    color: '#64748b',
  },
  linkText: {
    color: '#2f80ed',
    fontWeight: '600',
  },
});
