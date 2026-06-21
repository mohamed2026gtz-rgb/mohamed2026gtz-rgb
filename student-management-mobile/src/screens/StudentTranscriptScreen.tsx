import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getTranscript } from '../services/studentService';
import { StudentTranscript } from '../types';
import { StudentsStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<StudentsStackParamList, 'StudentTranscript'>;

export function StudentTranscriptScreen({ route }: Props) {
  const { studentNo } = route.params;
  const [transcript, setTranscript] = useState<StudentTranscript | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTranscript(studentNo)
      .then(setTranscript)
      .finally(() => setLoading(false));
  }, [studentNo]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{transcript?.studentName || studentNo}</Text>
      <Text style={styles.subtitle}>Enrollment / change history</Text>

      {transcript?.enrollmentHistory?.length ? (
        transcript.enrollmentHistory.map((h, i) => (
          <View key={i} style={styles.card}>
            <Text style={styles.cardTitle}>{h.year || '—'}</Text>
            {h.class && <Text style={styles.meta}>Field: {h.class}</Text>}
            {h.section && <Text style={styles.meta}>Type: {h.section}</Text>}
            {h.term1Total && <Text style={styles.meta}>Old: {h.term1Total}</Text>}
            {h.term2Total && <Text style={styles.meta}>New: {h.term2Total}</Text>}
            {h.status && <Text style={styles.meta}>Notes: {h.status}</Text>}
          </View>
        ))
      ) : (
        <Text style={styles.empty}>No transcript records</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  subtitle: { color: colors.textSecondary, marginVertical: 12 },
  card: {
    backgroundColor: colors.surface,
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
  },
  cardTitle: { fontWeight: '600', fontSize: 15 },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
});
