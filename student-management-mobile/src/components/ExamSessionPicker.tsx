import React, { useEffect, useMemo, useState } from 'react';
import { colors } from '../theme/colors';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { getExamSessionsForAttendance, sessionSubjectLabel } from '../services/examScheduleService';
import { ExamTimetableEntry, resolveExamCatalogLevel } from '../types';

interface Props {
  schoolLevel: string | null;
  examDate: string;
  selectedSubject: string;
  onSelect: (subject: string, session?: ExamTimetableEntry) => void;
  academicYear?: string;
}

export function ExamSessionPicker({
  schoolLevel,
  examDate,
  selectedSubject,
  onSelect,
  academicYear,
}: Props) {
  const [sessions, setSessions] = useState<ExamTimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const catalogLevel = useMemo(() => resolveExamCatalogLevel(schoolLevel), [schoolLevel]);

  useEffect(() => {
    if (!catalogLevel || !examDate.trim()) {
      setSessions([]);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await getExamSessionsForAttendance(
          catalogLevel,
          examDate.trim(),
          academicYear
        );
        if (!cancelled) {
          setSessions(rows);
          if (rows.length === 1 && !selectedSubject.trim()) {
            onSelect(sessionSubjectLabel(rows[0]), rows[0]);
          }
        }
      } catch {
        if (!cancelled) {
          setError('Could not load exam timetable for this date');
          setSessions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [academicYear, catalogLevel, examDate]);

  if (!catalogLevel) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>Select a school level to load subjects from the exam timetable.</Text>
      </View>
    );
  }

  if (!examDate.trim()) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>Enter the exam date to load scheduled subjects.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.box}>
        <ActivityIndicator color={colors.primary} />
        <Text style={styles.hint}>Loading exam sessions for {catalogLevel}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.box}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (!sessions.length) {
    return (
      <View style={styles.box}>
        <Text style={styles.hint}>
          No exam scheduled for {examDate} ({catalogLevel}). Add entries in the Exams tab →
          Timetable.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.box}>
      <Text style={styles.label}>Exam session · {examDate}</Text>
      <Text style={styles.subLabel}>
        {sessions.length === 1
          ? '1 exam today'
          : `${sessions.length} exams today — first and second shift`}
      </Text>
      <View style={styles.sessionList}>
        {sessions.map((session) => {
          const label = sessionSubjectLabel(session);
          const active = selectedSubject.trim() === label.trim();
          return (
            <Pressable
              key={session.id}
              style={[styles.sessionCard, active && styles.sessionCardActive]}
              onPress={() => onSelect(label, session)}
            >
              <View style={styles.shiftBadge}>
                <Text style={styles.shiftText}>{session.examShift}</Text>
              </View>
              <View style={styles.sessionBody}>
                <Text style={[styles.sessionTitle, active && styles.sessionTitleActive]}>
                  {session.subjectName}
                </Text>
                <Text style={styles.sessionMeta}>
                  {session.examShiftLabel}
                  {session.paperLabel ? ` · ${session.paperLabel}` : ''}
                </Text>
              </View>
              {active ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, fontWeight: '700', color: '#444', marginBottom: 4 },
  subLabel: { fontSize: 11, color: colors.textMuted, marginBottom: 10 },
  hint: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
  error: { fontSize: 13, color: colors.error },
  sessionList: { gap: 8 },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  sessionCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  shiftBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shiftText: { color: colors.white, fontWeight: '800', fontSize: 14 },
  sessionBody: { flex: 1 },
  sessionTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  sessionTitleActive: { color: colors.primary },
  sessionMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary, marginLeft: 8 },
});
