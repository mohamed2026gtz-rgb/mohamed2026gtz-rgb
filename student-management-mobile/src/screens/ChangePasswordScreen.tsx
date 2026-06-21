import React, { useState } from 'react';
import { colors } from '../theme/colors';
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
import { getApiErrorMessage } from '../services/apiClient';

export function ChangePasswordScreen() {
  const { changePassword, logout, user } = useAuth();
  const forced = Boolean(user?.mustChangePassword);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!currentPassword || !newPassword) {
      Alert.alert('Validation', 'Enter current and new password');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation', 'New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation', 'New passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password updated. You can continue using the app.');
    } catch (e: unknown) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not change password'));
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
        <Text style={styles.title}>
          {forced ? 'Change your password' : 'Update password'}
        </Text>
        <Text style={styles.subtitle}>
          {forced
            ? 'First login — you must set a new password before continuing.'
            : 'Enter your current password and choose a new one.'}
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Current password"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="New password (min 6 characters)"
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
        />
        <TextInput
          style={styles.input}
          placeholder="Confirm new password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        <Pressable style={[styles.button, loading && styles.disabled]} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Save new password</Text>
          )}
        </Pressable>

        {forced ? (
          <Pressable style={styles.linkBtn} onPress={logout}>
            <Text style={styles.linkText}>Sign out</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginVertical: 16, lineHeight: 20 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.7 },
  linkBtn: { marginTop: 20, alignItems: 'center' },
  linkText: { color: colors.error, fontWeight: '600' },
});
