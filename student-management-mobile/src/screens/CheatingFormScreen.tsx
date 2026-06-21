import React, { useEffect, useMemo, useState } from 'react';
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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { FilterPickerModal } from '../components/FilterPickerModal';
import { FilterOption } from '../components/FilterChips';
import {
  createCheatingIncident,
  getCheatingIncident,
  getCheatingTypes,
  updateCheatingIncident,
} from '../services/cheatingService';
import { todayDateString } from '../services/examAttendanceService';
import {
  CheatingSeverity,
  CheatingStatus,
  CheatingType,
} from '../types';
import { CheatingStackParamList, SupervisorCheatingStackParamList } from '../navigation/types';

type Props =
  | NativeStackScreenProps<CheatingStackParamList, 'CheatingForm'>
  | NativeStackScreenProps<SupervisorCheatingStackParamList, 'CheatingForm'>;

const SEVERITIES: CheatingSeverity[] = ['Minor', 'Moderate', 'Serious', 'Severe'];
const STATUSES: CheatingStatus[] = ['Reported', 'Under investigation', 'Action taken', 'Closed'];

export function CheatingFormScreen({ navigation, route }: Props) {
  const incidentId = route.params?.id;
  const presetSubject = route.params?.subject;
  const presetExamDate = route.params?.examDate;
  const isEdit = incidentId != null;
  const lockSessionFields = !isEdit && Boolean(presetSubject?.trim() && presetExamDate?.trim());

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState<CheatingType[]>([]);
  const [openPicker, setOpenPicker] = useState<'type' | 'severity' | 'status' | 'shift' | null>(null);

  const [studentNo, setStudentNo] = useState('');
  const [examDate, setExamDate] = useState(presetExamDate || todayDateString());
  const [subject, setSubject] = useState(presetSubject || '');
  const [examShift, setExamShift] = useState<number | null>(null);
  const [cheatingTypeId, setCheatingTypeId] = useState<number | null>(null);
  const [customTypeLabel, setCustomTypeLabel] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [invigilatorName, setInvigilatorName] = useState('');
  const [invigilatorAction, setInvigilatorAction] = useState('');
  const [supervisorName, setSupervisorName] = useState('');
  const [supervisorAction, setSupervisorAction] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [severity, setSeverity] = useState<CheatingSeverity>('Moderate');
  const [status, setStatus] = useState<CheatingStatus>('Reported');
  const [followUpNotes, setFollowUpNotes] = useState('');

  const selectedType = types.find((t) => t.id === cheatingTypeId);
  const showCustomType = selectedType?.code === 'other';

  const typeOptions = useMemo<FilterOption[]>(
    () => types.map((t) => ({ label: t.label, value: t.id, subtitle: t.description || undefined })),
    [types]
  );

  useEffect(() => {
    (async () => {
      const typeRows = await getCheatingTypes();
      setTypes(typeRows);
    })();
  }, []);

  useEffect(() => {
    if (!isEdit || !incidentId) return;
    (async () => {
      try {
        const item = await getCheatingIncident(incidentId);
        setStudentNo(item.studentNo);
        setExamDate(item.examDate);
        setSubject(item.subject);
        setExamShift(item.examShift ?? null);
        setCheatingTypeId(item.cheatingTypeId ?? null);
        setCustomTypeLabel(item.customTypeLabel || '');
        setIncidentDescription(item.incidentDescription);
        setEvidenceNotes(item.evidenceNotes || '');
        setInvigilatorName(item.invigilatorName || '');
        setInvigilatorAction(item.invigilatorAction || '');
        setSupervisorName(item.supervisorName || '');
        setSupervisorAction(item.supervisorAction || '');
        setActionTaken(item.actionTaken || '');
        setSeverity(item.severity);
        setStatus(item.status);
        setFollowUpNotes(item.followUpNotes || '');
      } catch {
        Alert.alert('Error', 'Could not load incident');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [incidentId, isEdit, navigation]);

  const save = async () => {
    if (!studentNo.trim() || !examDate.trim() || !subject.trim() || !incidentDescription.trim()) {
      Alert.alert('Validation', 'Student ID, exam date, subject, and description are required');
      return;
    }
    if (showCustomType && !customTypeLabel.trim()) {
      Alert.alert('Validation', 'Specify the cheating type when "Other" is selected');
      return;
    }

    setSaving(true);
    try {
      const body = {
        studentNo: studentNo.trim(),
        examDate: examDate.trim(),
        subject: subject.trim(),
        examShift: examShift ?? undefined,
        cheatingTypeId: cheatingTypeId ?? undefined,
        customTypeLabel: showCustomType ? customTypeLabel.trim() : undefined,
        incidentDescription: incidentDescription.trim(),
        evidenceNotes: evidenceNotes.trim() || undefined,
        invigilatorName: invigilatorName.trim() || undefined,
        invigilatorAction: invigilatorAction.trim() || undefined,
        supervisorName: supervisorName.trim() || undefined,
        supervisorAction: supervisorAction.trim() || undefined,
        actionTaken: actionTaken.trim() || undefined,
        severity,
        status,
        followUpNotes: followUpNotes.trim() || undefined,
      };

      if (isEdit && incidentId) {
        await updateCheatingIncident(incidentId, body);
      } else {
        await createCheatingIncident(body);
      }
      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>Student & exam</Text>
      <Field label="Student unique ID / number *" value={studentNo} onChangeText={setStudentNo} editable={!isEdit} />
      <Field
        label="Exam date (YYYY-MM-DD) *"
        value={examDate}
        onChangeText={setExamDate}
        editable={!lockSessionFields}
      />
      <Field
        label="Subject *"
        value={subject}
        onChangeText={setSubject}
        editable={!lockSessionFields}
      />
      <PickerRow
        label="Exam shift"
        value={examShift ? (examShift === 1 ? '1st exam' : '2nd exam') : 'Not specified'}
        onPress={() => setOpenPicker('shift')}
      />

      <Text style={styles.section}>Cheating details</Text>
      <PickerRow
        label="Type of cheating *"
        value={selectedType?.label || 'Select type'}
        onPress={() => setOpenPicker('type')}
      />
      {showCustomType ? (
        <Field label="Specify cheating type *" value={customTypeLabel} onChangeText={setCustomTypeLabel} />
      ) : null}
      <Field
        label="What happened (description) *"
        value={incidentDescription}
        onChangeText={setIncidentDescription}
        multiline
      />
      <Field label="Evidence / notes" value={evidenceNotes} onChangeText={setEvidenceNotes} multiline />

      <Text style={styles.section}>Actions taken</Text>
      <Field label="Invigilator name" value={invigilatorName} onChangeText={setInvigilatorName} />
      <Field label="Invigilator action" value={invigilatorAction} onChangeText={setInvigilatorAction} multiline />
      <Field label="Supervisor name" value={supervisorName} onChangeText={setSupervisorName} />
      <Field label="Supervisor action" value={supervisorAction} onChangeText={setSupervisorAction} multiline />
      <Field label="Final action taken" value={actionTaken} onChangeText={setActionTaken} multiline />

      <Text style={styles.section}>Case management</Text>
      <PickerRow label="Severity" value={severity} onPress={() => setOpenPicker('severity')} />
      <PickerRow label="Status" value={status} onPress={() => setOpenPicker('status')} />
      <Field label="Follow-up notes" value={followUpNotes} onChangeText={setFollowUpNotes} multiline />

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update report' : 'Save report'}</Text>
      </Pressable>

      <FilterPickerModal
        visible={openPicker === 'type'}
        title="Cheating type"
        options={typeOptions}
        selected={cheatingTypeId}
        onSelect={(v) => setCheatingTypeId(typeof v === 'number' ? v : null)}
        onClose={() => setOpenPicker(null)}
        searchable
      />
      <FilterPickerModal
        visible={openPicker === 'severity'}
        title="Severity"
        options={SEVERITIES.map((s) => ({ label: s, value: s }))}
        selected={severity}
        onSelect={(v) => setSeverity(String(v) as CheatingSeverity)}
        onClose={() => setOpenPicker(null)}
      />
      <FilterPickerModal
        visible={openPicker === 'status'}
        title="Status"
        options={STATUSES.map((s) => ({ label: s, value: s }))}
        selected={status}
        onSelect={(v) => setStatus(String(v) as CheatingStatus)}
        onClose={() => setOpenPicker(null)}
      />
      <FilterPickerModal
        visible={openPicker === 'shift'}
        title="Exam shift"
        options={[
          { label: 'Not specified', value: null },
          { label: '1st exam', value: 1 },
          { label: '2nd exam', value: 2 },
        ]}
        selected={examShift}
        onSelect={(v) => setExamShift(typeof v === 'number' ? v : null)}
        onClose={() => setOpenPicker(null)}
      />
    </ScrollView>
  );
}

function Field({
  label,
  value,
  onChangeText,
  multiline,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  multiline?: boolean;
  editable?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multiline, !editable && styles.readonly]}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        editable={editable}
      />
    </View>
  );
}

function PickerRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Pressable style={styles.pickerRow} onPress={onPress}>
        <Text style={styles.pickerValue}>{value}</Text>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    marginTop: 8,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  field: { marginBottom: 10 },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
  },
  readonly: { backgroundColor: '#f5f5f5', color: colors.textSecondary },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
  },
  pickerValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  chevron: { fontSize: 20, color: '#9fa8da' },
  saveBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
