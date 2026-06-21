import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { downloadStudentPhotoUri, getStudent } from '../services/studentService';
import { Student } from '../types';
import { DashboardStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<DashboardStackParamList, 'StudentPhoto'>;

export function StudentPhotoScreen({ route }: Props) {
  const [uniqueId, setUniqueId] = useState(route.params?.uniqueId ?? '');
  const [student, setStudent] = useState<Student | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStudent = async (id?: string) => {
    const term = (id ?? uniqueId).trim();
    if (!term) {
      setError('Enter a student unique ID (e.g. 19-286737)');
      return;
    }
    setLoading(true);
    setError(null);
    setStudent(null);
    setPhotoUri(null);
    try {
      const data = await getStudent(term);
      setStudent(data);
      if (!data.hasPicture) {
        setError('This student has no picture on record.');
        return;
      }
      const uri = await downloadStudentPhotoUri(data.studentNo);
      setPhotoUri(uri);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data
          ?.message ||
        (e as Error).message ||
        'Student not found';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (route.params?.uniqueId) {
      loadStudent(route.params.uniqueId);
    }
  }, [route.params?.uniqueId]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.subtitle}>Search by unique ID to view photo, name, and sex</Text>

      <TextInput
        style={styles.input}
        placeholder="Unique ID e.g. 19-286737"
        value={uniqueId}
        onChangeText={setUniqueId}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Pressable style={styles.button} onPress={() => loadStudent()} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>View Student</Text>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      {student && (
        <View style={styles.card}>
          <Text style={styles.name}>{student.fullName || student.studentNo}</Text>
          <Text style={styles.meta}>Unique ID: {student.studentNo}</Text>
          {student.sex && <Text style={styles.meta}>Sex: {student.sex}</Text>}
          {student.level && <Text style={styles.meta}>Level: {student.level}</Text>}

          {loading && !photoUri && (
            <ActivityIndicator style={{ marginTop: 20 }} size="large" color={colors.primary} />
          )}

          {photoUri && (
            <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  subtitle: { color: colors.textSecondary, marginBottom: 12, fontSize: 14 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 12,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  error: { color: colors.error, textAlign: 'center', marginBottom: 12 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.text, textAlign: 'center' },
  meta: { marginTop: 6, color: colors.textSecondary, fontSize: 14 },
  photo: {
    width: 220,
    height: 280,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: '#eef1f6',
  },
});
