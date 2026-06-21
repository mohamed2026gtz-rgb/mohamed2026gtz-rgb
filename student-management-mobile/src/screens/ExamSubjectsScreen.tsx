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
import {
  createExamSubject,
  deleteExamSubject,
  getExamCatalogLevels,
  getExamSubjects,
} from '../services/examScheduleService';
import { EXAM_CATALOG_LEVELS, ExamLevelInfo, ExamSubject } from '../types';

export function ExamSubjectsScreen() {
  const [levels, setLevels] = useState<ExamLevelInfo[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>(EXAM_CATALOG_LEVELS[0]);
  const [subjects, setSubjects] = useState<ExamSubject[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [subjectName, setSubjectName] = useState('');
  const [paperLabel, setPaperLabel] = useState('');

  const levelInfo = useMemo(
    () => levels.find((l) => l.level === selectedLevel),
    [levels, selectedLevel]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [levelRows, subjectRows] = await Promise.all([
        getExamCatalogLevels(),
        getExamSubjects({ level: selectedLevel }),
      ]);
      setLevels(levelRows);
      setSubjects(subjectRows);
    } catch {
      Alert.alert('Error', 'Failed to load exam subjects');
    } finally {
      setLoading(false);
    }
  }, [selectedLevel]);

  useEffect(() => {
    load();
  }, [load]);

  const addSubject = async () => {
    const name = subjectName.trim();
    if (!name) {
      Alert.alert('Validation', 'Enter a subject name');
      return;
    }
    setSaving(true);
    try {
      await createExamSubject({
        schoolLevel: selectedLevel,
        subjectName: name,
        paperLabel: paperLabel.trim() || undefined,
        sortOrder: subjects.length + 1,
      });
      setSubjectName('');
      setPaperLabel('');
      await load();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Could not add subject';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  const removeSubject = (item: ExamSubject) => {
    Alert.alert('Remove subject', `Remove "${item.subjectName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExamSubject(item.id);
            await load();
          } catch {
            Alert.alert('Error', 'Could not remove subject');
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.intro}>
        Configure exam subjects for each level. Attendance uses these names when linked to the
        timetable.
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

      <View style={styles.countBar}>
        <Text style={styles.countText}>
          {subjects.length} subject{subjects.length === 1 ? '' : 's'}
          {levelInfo?.expectedSubjects
            ? ` · expected ${levelInfo.expectedSubjects} for ${selectedLevel}`
            : ''}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : (
        subjects.map((item, index) => (
          <View key={item.id} style={styles.subjectRow}>
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{index + 1}</Text>
            </View>
            <View style={styles.subjectBody}>
              <Text style={styles.subjectName}>{item.subjectName}</Text>
              {item.paperLabel ? <Text style={styles.subjectMeta}>{item.paperLabel}</Text> : null}
            </View>
            <Pressable onPress={() => removeSubject(item)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ))
      )}

      <View style={styles.form}>
        <Text style={styles.formTitle}>Add subject</Text>
        <TextInput
          style={styles.input}
          placeholder="Subject name"
          value={subjectName}
          onChangeText={setSubjectName}
        />
        <TextInput
          style={styles.input}
          placeholder="Paper label (optional)"
          value={paperLabel}
          onChangeText={setPaperLabel}
        />
        <Pressable style={[styles.addBtn, saving && styles.addBtnDisabled]} onPress={addSubject} disabled={saving}>
          <Text style={styles.addBtnText}>{saving ? 'Adding...' : 'Add subject'}</Text>
        </Pressable>
      </View>
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
  countBar: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  countText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  orderBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  orderText: { fontWeight: '800', color: colors.primary },
  subjectBody: { flex: 1 },
  subjectName: { fontSize: 15, fontWeight: '700', color: colors.text },
  subjectMeta: { marginTop: 2, fontSize: 12, color: colors.textSecondary },
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
  input: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 8,
  },
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
