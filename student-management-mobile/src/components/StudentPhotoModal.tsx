import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { downloadStudentPhotoUri, getStudent } from '../services/studentService';
import { Student } from '../types';

interface Props {
  visible: boolean;
  studentNo: string | null;
  onClose: () => void;
}

export function StudentPhotoModal({ visible, studentNo, onClose }: Props) {
  const [student, setStudent] = useState<Student | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !studentNo) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setStudent(null);
      setPhotoUri(null);
      try {
        const data = await getStudent(studentNo);
        if (cancelled) return;
        setStudent(data);
        if (!data.hasPicture) {
          setError('No picture on record for this student.');
          return;
        }
        const uri = await downloadStudentPhotoUri(data.studentNo);
        if (!cancelled) setPhotoUri(uri);
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error).message || 'Could not load student photo');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visible, studentNo]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Student Photo</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {student ? (
            <View style={styles.body}>
              <Text style={styles.name}>{student.fullName || student.studentNo}</Text>
              <Text style={styles.meta}>ID: {student.studentNo}</Text>
              {student.registrationNo ? (
                <Text style={styles.meta}>Student No: {student.registrationNo}</Text>
              ) : null}
              {student.sex ? <Text style={styles.meta}>Sex: {student.sex}</Text> : null}
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '88%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  close: { color: colors.primary, fontWeight: '600' },
  body: { padding: 16, alignItems: 'center' },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  photo: {
    width: 220,
    height: 280,
    borderRadius: 12,
    marginTop: 16,
    backgroundColor: '#eef1f6',
  },
  error: { color: colors.error, textAlign: 'center', margin: 16 },
});
