import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FilterPickerModal } from '../components/FilterPickerModal';
import { FilterOption } from '../components/FilterChips';
import {
  createExamTimetableEntry,
  deleteExamTimetableEntry,
  getExamSubjects,
  getExamTimetable,
} from '../services/examScheduleService';
import { EXAM_CATALOG_LEVELS, ExamSubject, ExamTimetableEntry } from '../types';

function groupByDate(entries: ExamTimetableEntry[]): Map<string, ExamTimetableEntry[]> {
  const map = new Map<string, ExamTimetableEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.examDate) || [];
    list.push(entry);
    map.set(entry.examDate, list);
  }
  for (const [, list] of map) {
    list.sort((a, b) => a.examShift - b.examShift);
  }
  return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

export function ExamTimetableScreen() {
  const [selectedLevel, setSelectedLevel] = useState<string>(EXAM_CATALOG_LEVELS[0]);
  const [entries, setEntries] = useState<ExamTimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [examDate, setExamDate] = useState('');
  const [examShift, setExamShift] = useState<number>(1);
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [openSubjectPicker, setOpenSubjectPicker] = useState(false);

  const grouped = useMemo(() => groupByDate(entries), [entries]);

  const subjectOptions = useMemo<FilterOption[]>(
    () =>
      subjects.map((s) => ({
        label: s.subjectName,
        value: s.id,
        subtitle: s.paperLabel || undefined,
      })),
    [subjects]
  );

  const selectedSubjectLabel = useMemo(() => {
    const match = subjects.find((s) => s.id === selectedSubjectId);
    return match?.subjectName || '';
  }, [selectedSubjectId, subjects]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [timetableRows, subjectRows] = await Promise.all([
        getExamTimetable({ level: selectedLevel }),
        getExamSubjects({ level: selectedLevel }),
      ]);
      setEntries(timetableRows);
      setSubjects(subjectRows);
      if (selectedSubjectId && !subjectRows.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to load exam timetable');
    } finally {
      setLoading(false);
    }
  }, [selectedLevel, selectedSubjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const addEntry = async () => {
    if (!examDate.trim()) {
      Alert.alert('Validation', 'Enter exam date (YYYY-MM-DD)');
      return;
    }
    if (!selectedSubjectId) {
      Alert.alert('Validation', 'Select a subject');
      return;
    }
    setSaving(true);
    try {
      await createExamTimetableEntry({
        schoolLevel: selectedLevel,
        examDate: examDate.trim(),
        examShift,
        subjectId: selectedSubjectId,
        notes: notes.trim() || undefined,
      });
      setExamDate('');
      setNotes('');
      setExamShift(1);
      setSelectedSubjectId(null);
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not add timetable entry';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const removeEntry = (entry: ExamTimetableEntry) => {
    Alert.alert(
      'Remove entry',
      `Remove ${entry.subjectName} on ${entry.examDate} (${entry.examShiftLabel})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteExamTimetableEntry(entry.id);
              await load();
            } catch {
              Alert.alert('Error', 'Could not remove entry');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Schedule exam days. Each day can have a first exam (shift 1) and optionally a second exam
        (shift 2).
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.levelRow}>
        {EXAM_CATALOG_LEVELS.map((level) => (
          <Pressable
            key={level}
            style={[styles.levelChip, selectedLevel === level && styles.levelChipActive]}
            onPress={() => setSelectedLevel(level)}
          >
            <Text style={[styles.levelChipText, selectedLevel === level && styles.levelChipTextActive]}>
              {level}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : grouped.size === 0 ? (
        <Text style={styles.empty}>No exam days scheduled for {selectedLevel} yet.</Text>
      ) : (
        [...grouped.entries()].map(([date, dayEntries]) => (
          <View key={date} style={styles.dayCard}>
            <Text style={styles.dayTitle}>Exam day · {date}</Text>
            {dayEntries.map((entry) => (
              <View key={entry.id} style={styles.shiftRow}>
                <View style={styles.shiftBadge}>
                  <Text style={styles.shiftText}>{entry.examShift}</Text>
                </View>
                <View style={styles.shiftBody}>
                  <Text style={styles.shiftSubject}>{entry.subjectName}</Text>
                  <Text style={styles.shiftMeta}>{entry.examShiftLabel}</Text>
                </View>
                <Pressable onPress={() => removeEntry(entry)}>
                  <Text style={styles.remove}>Remove</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ))
      )}

      <View style={styles.form}>
        <Text style={styles.formTitle}>Add exam day entry</Text>
        <TextInput
          style={styles.input}
          placeholder="Exam date (YYYY-MM-DD)"
          value={examDate}
          onChangeText={setExamDate}
        />

        <Text style={styles.fieldLabel}>Exam shift</Text>
        <View style={styles.shiftPicker}>
          {[1, 2].map((shift) => (
            <Pressable
              key={shift}
              style={[styles.shiftOption, examShift === shift && styles.shiftOptionActive]}
              onPress={() => setExamShift(shift)}
            >
              <Text
                style={[styles.shiftOptionText, examShift === shift && styles.shiftOptionTextActive]}
              >
                {shift === 1 ? '1st exam' : '2nd exam'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Subject</Text>
        <Pressable style={styles.pickerRow} onPress={() => setOpenSubjectPicker(true)}>
          <Text style={selectedSubjectLabel ? styles.pickerValue : styles.pickerPlaceholder}>
            {selectedSubjectLabel || 'Choose subject'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        <TextInput
          style={styles.input}
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
        />

        <Pressable style={[styles.addBtn, saving && styles.addBtnDisabled]} onPress={addEntry} disabled={saving}>
          <Text style={styles.addBtnText}>{saving ? 'Saving...' : 'Add to timetable'}</Text>
        </Pressable>
      </View>

      <FilterPickerModal
        visible={openSubjectPicker}
        title="Select subject"
        subtitle={`Subjects for ${selectedLevel}`}
        options={subjectOptions}
        selected={selectedSubjectId}
        onSelect={(v) => setSelectedSubjectId(typeof v === 'number' ? v : null)}
        onClose={() => setOpenSubjectPicker(false)}
        searchable
        searchPlaceholder="Search subjects..."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  intro: { margin: 12, fontSize: 13, color: '#555', lineHeight: 18 },
  levelRow: { paddingHorizontal: 12, gap: 8, marginBottom: 10 },
  levelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#d0d7e2',
  },
  levelChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  levelChipText: { fontSize: 13, color: '#333', fontWeight: '600' },
  levelChipTextActive: { color: colors.white },
  empty: { margin: 12, color: colors.textMuted, fontSize: 13 },
  dayCard: {
    marginHorizontal: 12,
    marginBottom: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayTitle: { fontSize: 14, fontWeight: '800', color: colors.primary, marginBottom: 8 },
  shiftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f2f7',
  },
  shiftBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  shiftText: { color: colors.white, fontWeight: '800' },
  shiftBody: { flex: 1 },
  shiftSubject: { fontSize: 14, fontWeight: '700', color: colors.text },
  shiftMeta: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  remove: { color: colors.error, fontWeight: '600', fontSize: 12 },
  form: {
    margin: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formTitle: { fontSize: 14, fontWeight: '700', color: colors.primary, marginBottom: 10 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
  shiftPicker: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  shiftOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d0d7e2',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  shiftOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  shiftOptionText: { fontWeight: '600', color: '#333' },
  shiftOptionTextActive: { color: colors.white },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dde3ee',
    backgroundColor: '#f8faff',
    marginBottom: 8,
  },
  pickerValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  pickerPlaceholder: { flex: 1, fontSize: 14, color: '#aaa' },
  chevron: { fontSize: 20, color: '#9fa8da' },
  addBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  addBtnDisabled: { opacity: 0.6 },
  addBtnText: { color: colors.white, fontWeight: '700' },
});
