import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { defaultBaseUrl } from '../config/api';
import { getApiBaseUrl, setApiBaseUrl, testConnection } from '../services/apiClient';
import { downloadAuthenticatedPhotoUri } from '../services/photoDownloadService';
import { downloadStudentPhotoUri } from '../services/studentService';
import { assertSecureApiUrl } from '../utils/networkSecurity';
import { primaryRoleLabel } from '../types';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const [apiUrl, setApiUrlState] = useState(defaultBaseUrl());
  const [status, setStatus] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);

  useEffect(() => {
    getApiBaseUrl().then((url) => setApiUrlState(url || defaultBaseUrl()));
  }, []);

  useEffect(() => {
    if (!user?.hasPicture) {
      setPhotoUri(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setPhotoLoading(true);
      try {
        let uri: string;
        if (user.studentNo) {
          uri = await downloadStudentPhotoUri(user.studentNo);
        } else if (user.photoUrl) {
          uri = await downloadAuthenticatedPhotoUri(
            user.photoUrl,
            `profile-photo-${user.id.replace(/[^a-zA-Z0-9-]/g, '_')}.jpg`
          );
        } else {
          setPhotoUri(null);
          return;
        }
        if (!cancelled) setPhotoUri(uri);
      } catch {
        if (!cancelled) setPhotoUri(null);
      } finally {
        if (!cancelled) setPhotoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const resolvedApiUrl = () => apiUrl.trim() || defaultBaseUrl();

  const saveUrl = async () => {
    const url = resolvedApiUrl();
    const check = assertSecureApiUrl(url);
    if (!check.ok) {
      setStatus(check.message);
      return;
    }
    setApiUrlState(url);
    try {
      await setApiBaseUrl(url);
      setStatus('API URL saved');
    } catch (e: unknown) {
      setStatus((e as Error).message || 'Could not save API URL');
    }
  };

  const test = async () => {
    const url = resolvedApiUrl();
    setApiUrlState(url);
    try {
      const result = await testConnection(url);
      if (result.ok) {
        const saved = await getApiBaseUrl();
        setApiUrlState(saved);
      }
      setStatus(
        result.ok
          ? 'Connection OK'
          : result.error
            ? `Connection failed (${result.error})`
            : 'Connection failed'
      );
    } catch {
      setStatus('Connection failed');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            {photoLoading ? (
              <ActivityIndicator color={colors.primary} />
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {(user?.fullName || user?.userName || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <View style={styles.profileBody}>
            <Text style={styles.name}>{user?.fullName || user?.userName}</Text>
            <Text style={styles.meta}>{user?.email || user?.userName}</Text>
            <Text style={styles.roleBadge}>{primaryRoleLabel(user)}</Text>
          </View>
        </View>
        {user?.supervisorAssignment?.centerName ? (
          <View style={styles.scopeBlock}>
            <Text style={styles.scopeTitle}>Exam center assignment</Text>
            <Text style={styles.meta}>
              {user.supervisorAssignment.centerName}
              {user.supervisorAssignment.region ? ` · ${user.supervisorAssignment.region}` : ''}
              {user.supervisorAssignment.district ? ` · ${user.supervisorAssignment.district}` : ''}
            </Text>
            {user.supervisorAssignment.academicYear ? (
              <Text style={styles.metaSmall}>Academic year: {user.supervisorAssignment.academicYear}</Text>
            ) : null}
            {user.supervisorAssignment.schoolCount != null ? (
              <Text style={styles.metaSmall}>
                {user.supervisorAssignment.schoolCount} schools ·{' '}
                {user.supervisorAssignment.studentCount ?? '—'} students
              </Text>
            ) : null}
          </View>
        ) : null}
        {user?.accessScope?.scopeType ? (
          <View style={styles.scopeBlock}>
            <Text style={styles.scopeTitle}>Access scope</Text>
            <Text style={styles.metaSmall}>
              {[
                user.accessScope.scopeType.replace('_', ' '),
                user.accessScope.regionName,
                user.accessScope.districtName,
                user.accessScope.schoolLevel,
                user.accessScope.schoolCount != null
                  ? `${user.accessScope.schoolCount} schools`
                  : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          </View>
        ) : null}
        {user?.schoolId != null && (
          <Text style={styles.meta}>School ID: {user.schoolId}</Text>
        )}
        {!user?.hasPicture ? (
          <Text style={styles.noPhoto}>No profile photo on record</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>API Server</Text>
        <Text style={styles.hint}>
          Use https:// for production. http:// is allowed only for localhost or private LAN (192.168.x.x).
        </Text>
        <TextInput
          style={styles.input}
          value={apiUrl}
          onChangeText={setApiUrlState}
          placeholder={defaultBaseUrl()}
          placeholderTextColor="#999"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.row}>
          <Pressable style={styles.secondaryBtn} onPress={saveUrl}>
            <Text style={styles.secondaryText}>Save</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={test}>
            <Text style={styles.secondaryText}>Test</Text>
          </Pressable>
        </View>
        {status && <Text style={styles.status}>{status}</Text>}
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  avatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginRight: 14,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#c5cae9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 32, fontWeight: '800', color: colors.primary },
  profileBody: { flex: 1 },
  name: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { marginTop: 6, color: colors.textSecondary },
  metaSmall: { marginTop: 4, color: colors.textMuted, fontSize: 12 },
  scopeBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  scopeTitle: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginBottom: 4 },
  noPhoto: { marginTop: 10, fontSize: 12, color: colors.textMuted, fontStyle: 'italic' },
  roleBadge: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sectionTitle: { fontWeight: '600', marginBottom: 8 },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 8, lineHeight: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', gap: 10 },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  secondaryText: { color: colors.primary, fontWeight: '600' },
  status: { marginTop: 8, color: colors.success },
  logoutBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
  },
  logoutText: { color: colors.white, fontWeight: '600' },
});
