import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { defaultBaseUrl, resolveBaseUrl } from '../config/api';
import {
  getApiBaseUrl,
  getApiErrorMessage,
  setApiBaseUrl,
  testConnection,
} from '../services/apiClient';

import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/types';
import { sanitizeEmail } from '../utils/inputSanitize';
import { colors, radii, shadows } from '../theme/colors';

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList, 'StaffLogin'>>();
  const { login } = useAuth();
  const defaultUrl = defaultBaseUrl();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apiUrl, setApiUrl] = useState(defaultUrl);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  useEffect(() => {
    getApiBaseUrl().then(async (url) => {
      const resolved = resolveBaseUrl(url);
      setApiUrl(resolved);
      if (url && url !== resolved) {
        await setApiBaseUrl(resolved);
      }
    });
  }, []);

  const resolvedApiUrl = () => apiUrl.trim() || defaultBaseUrl();

  const handleTest = async () => {
    setTesting(true);
    setConnectionStatus(null);
    try {
      const url = resolvedApiUrl();
      setApiUrl(url);
      const result = await testConnection(url);
      let savedUrl = url;
      if (result.ok) {
        savedUrl = await getApiBaseUrl();
        setApiUrl(savedUrl);
      }
      setConnectionStatus(
        result.ok
          ? `Connected — ${result.url || savedUrl}`
          : result.error
            ? `Server unreachable (${result.error})`
            : 'Server unreachable'
      );
    } catch {
      setConnectionStatus('Connection failed');
    } finally {
      setTesting(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation', 'Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const url = resolvedApiUrl();
      setApiUrl(url);
      await setApiBaseUrl(url);
      await login(sanitizeEmail(email), password);
    } catch (e: unknown) {
      const msg = getApiErrorMessage(
        e,
        'Login failed — use your web admin email and password (not student ID)'
      );
      Alert.alert('Login failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Student Management</Text>
        <Text style={styles.subtitle}>Sign in with your email</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </Pressable>

        <Pressable onPress={() => setShowAdvanced(!showAdvanced)}>
          <Text style={styles.link}>
            {showAdvanced ? 'Hide server settings' : 'Server settings'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.studentLink}
          onPress={() => navigation.navigate('StudentFaceLogin')}
        >
          <Text style={styles.studentLinkText}>Student login (face verification) →</Text>
        </Pressable>

        <Text style={styles.hint}>
          API server: {resolveBaseUrl(apiUrl)}
          {'\n'}Phone and PC must be on the same Wi‑Fi. Use Server settings → Test connection.
        </Text>

        {showAdvanced && (
          <View style={styles.advanced}>
            <Text style={styles.label}>API URL (no /api suffix)</Text>
            <TextInput
              style={styles.input}
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder={defaultUrl}
              placeholderTextColor="#999"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable style={styles.secondaryButton} onPress={handleTest} disabled={testing}>
              <Text style={styles.secondaryText}>
                {testing ? 'Testing...' : 'Test connection'}
              </Text>
            </Pressable>
            {connectionStatus && (
              <Text
                style={[
                  styles.status,
                  { color: connectionStatus.startsWith('Connected') ? colors.success : colors.error },
                ]}
              >
                {connectionStatus}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.primaryDark, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 24, marginTop: 8 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    ...shadows.card,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16, fontWeight: '600' },
  studentLink: {
    marginTop: 12,
    marginHorizontal: 8,
    padding: 14,
    backgroundColor: colors.successBg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  studentLinkText: { color: colors.success, textAlign: 'center', fontWeight: '700' },
  hint: {
    marginTop: 12,
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
  },
  advanced: { marginTop: 16 },
  label: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, fontWeight: '600' },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: 12,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.primary, fontWeight: '700' },
  status: { marginTop: 8, textAlign: 'center', fontWeight: '600' },
});
