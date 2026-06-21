import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { downloadStudentPhotoUri } from '../services/studentService';

export function StudentPortalScreen() {
  const { user, logout } = useAuth();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(false);

  useEffect(() => {
    if (!user?.studentNo || !user.hasPicture) return;
    setLoadingPhoto(true);
    downloadStudentPhotoUri(user.studentNo)
      .then(setPhotoUri)
      .catch(() => setPhotoUri(null))
      .finally(() => setLoadingPhoto(false));
  }, [user?.studentNo, user?.hasPicture]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.badgeWrap}>
        <Text style={styles.badge}>Student access · face verified</Text>
      </View>
      <Text style={styles.name}>{user?.fullName || 'Student'}</Text>
      <Text style={styles.meta}>ID: {user?.studentNo || user?.userName}</Text>
      {user?.registrationNo ? (
        <Text style={styles.meta}>Registration: {user.registrationNo}</Text>
      ) : null}
      {user?.schoolName ? <Text style={styles.meta}>School: {user.schoolName}</Text> : null}

      <View style={styles.photoCard}>
        <Text style={styles.photoTitle}>Saved photo (database)</Text>
        {loadingPhoto ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} />
        ) : photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} />
        ) : (
          <Text style={styles.noPhoto}>Photo not available</Text>
        )}
      </View>

      <Text style={styles.note}>
        You signed in using face verification matched to your official student photo on record.
      </Text>

      <Pressable style={styles.logoutBtn} onPress={logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, paddingBottom: 40 },
  badgeWrap: {
    alignSelf: 'center',
    marginBottom: 12,
    backgroundColor: colors.successBg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badge: { color: colors.success, fontWeight: '700', fontSize: 12 },
  name: { fontSize: 24, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  meta: { fontSize: 14, color: '#555', textAlign: 'center', marginTop: 4 },
  photoCard: {
    marginTop: 24,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoTitle: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 12 },
  photo: { width: '100%', height: 280, borderRadius: 10, backgroundColor: '#eee' },
  noPhoto: { textAlign: 'center', color: colors.textMuted, paddingVertical: 40 },
  note: { marginTop: 16, fontSize: 13, color: colors.textSecondary, lineHeight: 18, textAlign: 'center' },
  logoutBtn: {
    marginTop: 24,
    backgroundColor: '#c62828',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  logoutText: { color: colors.white, fontWeight: '700' },
});
