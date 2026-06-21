import React from 'react';
import { colors } from '../theme/colors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { ExamScheduleStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<ExamScheduleStackParamList, 'ExamScheduleHome'>;

export function ExamScheduleHomeScreen({ navigation }: Props) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Exam timetable</Text>
        <Text style={styles.heroText}>
          Record subjects by level (Primary, ABE, Secondary, Technical TVET), then schedule exam
          days with first and second shift sessions. Attendance screens load subjects from this
          timetable.
        </Text>
      </View>

      <Pressable style={styles.card} onPress={() => navigation.navigate('ExamSubjects')}>
        <Text style={styles.cardStep}>1</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Exam subjects</Text>
          <Text style={styles.cardText}>
            Primary & ABE: 7 subjects · Secondary: 12 subjects · TVET: configurable
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>

      <Pressable style={styles.card} onPress={() => navigation.navigate('ExamTimetable')}>
        <Text style={styles.cardStep}>2</Text>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>Exam days & shifts</Text>
          <Text style={styles.cardText}>
            Assign subjects to exam days — one or two exams per day (1st and 2nd shift)
          </Text>
        </View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: {
    margin: 12,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  heroTitle: { color: colors.white, fontSize: 20, fontWeight: '800' },
  heroText: { color: '#c5cae9', marginTop: 8, fontSize: 13, lineHeight: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    textAlign: 'center',
    lineHeight: 32,
    fontWeight: '800',
    color: colors.primary,
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  cardText: { marginTop: 4, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  chevron: { fontSize: 24, color: '#9fa8da', marginLeft: 8 },
});
