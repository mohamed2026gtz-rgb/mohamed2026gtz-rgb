import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ExamSessionPicker } from './ExamSessionPicker';
import { saveExamAttendance } from '../services/examAttendanceService';
import { ExamAttendanceStatus, Student } from '../types';

const STATUS_OPTIONS: ExamAttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

interface Props {
  visible: boolean;
  student: Student | null;
  defaultSubject?: string;
  schoolLevel?: string | null;
  examDate?: string;
  onClose: () => void;
  onSaved: () => void;
}

export function ExamAttendanceModal({
  visible,
  student,
  defaultSubject,
  schoolLevel,
  examDate,
  onClose,
  onSaved,
}: Props) {
  const [subject, setSubject] = useState(defaultSubject || '');
  const [attendanceDate, setAttendanceDate] = useState(examDate || '');
  const [status, setStatus] = useState<ExamAttendanceStatus>('Present');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setSubject(defaultSubject || '');
      setAttendanceDate(examDate || '');
      setStatus('Present');
      setNotes('');
      setError(null);
    }
  }, [visible, defaultSubject, examDate, student?.studentNo]);

  const handleSave = async () => {
    if (!student) return;
    const trimmedSubject = subject.trim();
    const trimmedDate = attendanceDate.trim();
    if (!trimmedSubject) {
      setError('Select an exam subject from the timetable');
      return;
    }
    if (!trimmedDate) {
      setError('Enter the exam date');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveExamAttendance({
        studentNo: student.studentNo,
        subject: trimmedSubject,
        attendanceDate: trimmedDate,
        status,
        notes: notes.trim() || undefined,
        updatedAt: new Date().toISOString(),
      });
      onSaved();
      onClose();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not save attendance to server');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Exam Attendance</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={styles.close}>Cancel</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {student ? (
              <>
                <Text style={styles.studentName}>{student.fullName || student.studentNo}</Text>
                <Text style={styles.meta}>
                  {student.registrationNo || student.studentNo}
                  {student.sex ? ` · ${student.sex}` : ''}
                </Text>

                <Text style={styles.label}>Exam date</Text>
                <TextInput
                  style={styles.input}
                  placeholder="YYYY-MM-DD"
                  value={attendanceDate}
                  onChangeText={(v) => {
                    setAttendanceDate(v);
                    setSubject('');
                  }}
                />

                <ExamSessionPicker
                  schoolLevel={schoolLevel || student.schoolLevel || null}
                  examDate={attendanceDate}
                  selectedSubject={subject}
                  onSelect={setSubject}
                />

                <Text style={styles.label}>Status</Text>
                <View style={styles.statusRow}>
                  {STATUS_OPTIONS.map((opt) => (
                    <Pressable
                      key={opt}
                      style={[styles.statusChip, status === opt && styles.statusChipActive]}
                      onPress={() => setStatus(opt)}
                    >
                      <Text
                        style={[styles.statusChipText, status === opt && styles.statusChipTextActive]}
                      >
                        {opt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.label}>Notes (optional)</Text>
                <TextInput
                  style={[styles.input, styles.notesInput]}
                  placeholder="Remarks"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                />

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <Pressable
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save attendance'}</Text>
                </Pressable>
              </>
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
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
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
  close: { color: colors.textSecondary, fontWeight: '600' },
  content: { padding: 16, paddingBottom: 28 },
  studentName: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { marginTop: 4, marginBottom: 16, color: colors.textSecondary, fontSize: 13 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6, marginTop: 8 },
  input: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  notesInput: { minHeight: 72, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#c5cee0',
    backgroundColor: colors.surface,
  },
  statusChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  statusChipText: { fontSize: 13, color: '#333' },
  statusChipTextActive: { color: colors.white, fontWeight: '600' },
  saveBtn: {
    marginTop: 20,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  error: { color: colors.error, marginTop: 10, textAlign: 'center' },
});
