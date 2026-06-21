import React from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CenterAttendanceStats, ExamSubject } from '../types';
import {
  getSubjectProgressDetail,
  SubjectAttendanceProgress,
} from '../utils/subjectAttendanceStatus';

interface Props {
  centerName: string;
  centerLevel: 'Primary' | 'Secondary';
  region?: string | null;
  academicYear?: string;
  subjects: ExamSubject[];
  loading: boolean;
  examDate: string;
  selectedSubject: string;
  onExamDateChange: (date: string) => void;
  onSelectSubject: (subjectName: string) => void;
  onContinue: () => void;
  introText?: string;
  continuePrefix?: string;
  /** Tap a subject → confirm → enter that session (hides Continue button). */
  confirmOnSelect?: boolean;
  subjectProgress?: Record<string, SubjectAttendanceProgress>;
  attendanceStats?: CenterAttendanceStats | null;
}

const LEVEL_META = {
  Primary: {
    badge: 'Primary exam center',
    subjectHint: '7 exam subjects',
    accent: '#2e7d32',
  },
  Secondary: {
    badge: 'Secondary exam center',
    subjectHint: '12 exam subjects',
    accent: '#1565c0',
  },
};

const PROGRESS_META: Record<
  SubjectAttendanceProgress,
  { label: string; color: string; background: string }
> = {
  complete: { label: 'Complete', color: '#1b5e20', background: '#e8f5e9' },
  partial: { label: 'In progress', color: '#e65100', background: '#fff3e0' },
  none: { label: 'Not started', color: '#616161', background: '#f5f5f5' },
};

function progressCaption(
  progress: SubjectAttendanceProgress,
  stats: CenterAttendanceStats | null | undefined,
  subjectName: string,
  examDate: string
): string {
  if (progress === 'complete') {
    return 'All students marked for this subject';
  }
  const detail = getSubjectProgressDetail(stats ?? null, subjectName, examDate);
  const total = stats?.summary.totalStudentsInCenter ?? 0;
  if (progress === 'partial' && detail && total > 0) {
    return `${detail.students} of ${total} students marked`;
  }
  return PROGRESS_META[progress].label;
}

export function SupervisorExamSubjectStep({
  centerName,
  centerLevel,
  region,
  academicYear,
  subjects,
  loading,
  examDate,
  selectedSubject,
  onExamDateChange,
  onSelectSubject,
  onContinue,
  introText = 'Select the exam date and subject for this attendance session. You will then mark students school by school in your center.',
  continuePrefix = 'Continue',
  confirmOnSelect = false,
  subjectProgress = {},
  attendanceStats = null,
}: Props) {
  const meta = LEVEL_META[centerLevel];
  const canContinue = Boolean(selectedSubject.trim() && examDate.trim());

  const handleSubjectPress = (subjectName: string) => {
    if (!examDate.trim()) {
      Alert.alert('Exam date required', 'Enter the exam date before choosing a subject.');
      return;
    }

    if (!confirmOnSelect) {
      onSelectSubject(subjectName);
      return;
    }

    const progress = subjectProgress[subjectName] ?? 'none';
    const progressNote =
      progress === 'complete'
        ? '\n\nAll attendance records are already saved for this subject.'
        : progress === 'partial'
          ? `\n\n${progressCaption(progress, attendanceStats, subjectName, examDate)}.`
          : '';

    Alert.alert(
      'Start this subject?',
      `Mark attendance for ${subjectName} on ${examDate}?${progressNote}\n\nYou will mark students school by school in your center.`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, continue',
          onPress: () => {
            onSelectSubject(subjectName);
            onContinue();
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={[styles.hero, { borderLeftColor: meta.accent }]}>
        <Text style={[styles.badge, { color: meta.accent }]}>{meta.badge}</Text>
        <Text style={styles.centerName}>{centerName}</Text>
        <Text style={styles.centerMeta}>
          {[region, academicYear].filter(Boolean).join(' · ')}
        </Text>
        <Text style={styles.subjectCount}>
          {loading
            ? 'Loading subjects...'
            : `${subjects.length} subject${subjects.length === 1 ? '' : 's'} · ${meta.subjectHint}`}
        </Text>
      </View>

      <Text style={styles.intro}>{introText}</Text>

      <View style={styles.fieldBox}>
        <Text style={styles.fieldLabel}>Exam date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.fieldInput}
          value={examDate}
          onChangeText={onExamDateChange}
          placeholder="2026-06-15"
        />
      </View>

      <Text style={styles.sectionTitle}>Select subject</Text>
      {confirmOnSelect ? (
        <Text style={styles.tapHint}>
          Tap a subject to confirm and start marking attendance for that exam only.
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
      ) : subjects.length === 0 ? (
        <Text style={styles.empty}>
          No subjects configured for {centerLevel}. Ask administration to set up exam subjects.
        </Text>
      ) : (
        <View style={styles.subjectGrid}>
          {subjects.map((item, index) => {
            const active = selectedSubject === item.subjectName;
            const progress = subjectProgress[item.subjectName] ?? 'none';
            const progressMeta = PROGRESS_META[progress];
            const isComplete = progress === 'complete';
            return (
              <Pressable
                key={item.id}
                style={[
                  styles.subjectCard,
                  active && styles.subjectCardActive,
                  isComplete && styles.subjectCardComplete,
                ]}
                onPress={() => handleSubjectPress(item.subjectName)}
              >
                <View style={[styles.orderBadge, active && styles.orderBadgeActive]}>
                  <Text style={[styles.orderText, active && styles.orderTextActive]}>
                    {index + 1}
                  </Text>
                </View>
                <View style={styles.subjectBody}>
                  <Text style={[styles.subjectName, active && styles.subjectNameActive]}>
                    {item.subjectName}
                  </Text>
                  {item.paperLabel ? (
                    <Text style={styles.subjectMeta}>{item.paperLabel}</Text>
                  ) : null}
                  {confirmOnSelect ? (
                    <View
                      style={[
                        styles.progressBadge,
                        { backgroundColor: progressMeta.background },
                      ]}
                    >
                      <Text style={[styles.progressBadgeText, { color: progressMeta.color }]}>
                        {progress === 'complete' ? '✓ ' : ''}
                        {progressCaption(progress, attendanceStats, item.subjectName, examDate)}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {active && !confirmOnSelect ? <Text style={styles.check}>✓</Text> : null}
                {isComplete && confirmOnSelect ? (
                  <Text style={styles.completeMark}>✓</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      {!confirmOnSelect ? (
        <Pressable
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          disabled={!canContinue}
          onPress={onContinue}
        >
          <Text style={styles.continueBtnText}>
            {canContinue
              ? `${continuePrefix} — ${selectedSubject} · ${examDate}`
              : 'Select date and subject to continue'}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  hero: {
    margin: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
  },
  badge: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  centerName: { marginTop: 6, fontSize: 20, fontWeight: '800', color: colors.primary },
  centerMeta: { marginTop: 4, fontSize: 13, color: colors.textSecondary },
  subjectCount: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  intro: {
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  fieldBox: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  fieldInput: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  sectionTitle: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tapHint: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
  },
  empty: { marginHorizontal: 16, fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  subjectGrid: { marginHorizontal: 12, gap: 8 },
  subjectCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  subjectCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  subjectCardComplete: {
    borderColor: '#a7f3d0',
  },
  orderBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderBadgeActive: { backgroundColor: colors.primary },
  orderText: { fontWeight: '800', color: colors.primary, fontSize: 14 },
  orderTextActive: { color: colors.white },
  subjectBody: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text },
  subjectNameActive: { color: colors.primary },
  subjectMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  progressBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  progressBadgeText: { fontSize: 11, fontWeight: '700' },
  check: { fontSize: 18, fontWeight: '700', color: colors.primary },
  completeMark: { fontSize: 20, fontWeight: '800', color: colors.success, marginLeft: 8 },
  continueBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueBtnDisabled: { opacity: 0.5 },
  continueBtnText: { color: colors.white, fontWeight: '700', fontSize: 14, textAlign: 'center' },
});
