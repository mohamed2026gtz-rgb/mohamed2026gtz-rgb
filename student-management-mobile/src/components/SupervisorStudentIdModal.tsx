import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StudentIdCard } from './StudentIdCard';
import {
  downloadMyCenterStudentPhotoUri,
  lookupMyCenterStudent,
  SupervisorStudentProfile,
} from '../services/supervisorMeService';

interface Props {
  visible: boolean;
  studentNo: string | null;
  examCenterName?: string;
  academicYear?: string;
  onClose: () => void;
}

export function SupervisorStudentIdModal({
  visible,
  studentNo,
  examCenterName,
  academicYear,
  onClose,
}: Props) {
  const [student, setStudent] = useState<SupervisorStudentProfile | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
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
        const data = await lookupMyCenterStudent(studentNo);
        if (cancelled) return;
        setStudent(data);

        if (data.hasPicture) {
          setPhotoLoading(true);
          try {
            const uri = await downloadMyCenterStudentPhotoUri(data.studentNo);
            if (!cancelled) setPhotoUri(uri);
          } catch {
            if (!cancelled) setPhotoUri(null);
          } finally {
            if (!cancelled) setPhotoLoading(false);
          }
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError((e as Error).message || 'Could not load student ID card');
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
            <Text style={styles.headerTitle}>Student ID Card</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.scroll}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: 32 }} />
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            {student ? (
              <StudentIdCard
                student={student}
                photoUri={photoUri}
                photoLoading={photoLoading}
                examCenterName={student.examCenterName || examCenterName}
                academicYear={student.academicYear || academicYear}
              />
            ) : null}
          </ScrollView>
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
    backgroundColor: colors.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: colors.primary },
  close: { color: colors.primary, fontWeight: '600' },
  scroll: { paddingBottom: 24 },
  error: { color: colors.error, textAlign: 'center', margin: 16 },
});
