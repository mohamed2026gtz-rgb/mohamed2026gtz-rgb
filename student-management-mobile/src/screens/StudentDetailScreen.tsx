import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getStudent } from '../services/studentService';
import { Student } from '../types';
import { StudentsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentDetail'>;

export function StudentDetailScreen({ route, navigation }: Props) {
  const { studentNo } = route.params;
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStudent(studentNo)
      .then(setStudent)
      .finally(() => setLoading(false));
  }, [studentNo]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.center}>
        <Text>Student not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{student.fullName}</Text>
      <Info label="Unique ID" value={student.studentNo} />
      <Info label="Sex" value={student.sex} />
      <Info label="Class" value={student.classId} />
      <Info label="School ID" value={student.schoolId?.toString()} />
      <Info label="Phone" value={student.studentTell} />
      <Info label="Address" value={student.studentAddress} />
      <Info label="Status" value={student.status} />

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate('StudentTranscript', { studentNo })}
      >
        <Text style={styles.buttonText}>View Transcript</Text>
      </Pressable>
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16, color: colors.text },
  row: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  label: { fontSize: 12, color: colors.textMuted },
  value: { fontSize: 16, marginTop: 4, color: '#333' },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonText: { color: colors.white, fontWeight: '600' },
});
