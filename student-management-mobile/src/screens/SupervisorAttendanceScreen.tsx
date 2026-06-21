import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AttendanceCheckbox } from '../components/AttendanceCheckbox';
import { AttendanceClassPanel } from '../components/AttendanceClassPanel';
import { DataTable, TableText } from '../components/DataTable';
import { ScopeFilterPanel } from '../components/ScopeFilterPanel';
import { SupervisorExamSubjectStep } from '../components/SupervisorExamSubjectStep';
import { buildCenterSchoolFilterOptions } from '../utils/filterOptions';
import {
  getExamAttendanceMapForSession,
  saveBulkExamAttendance,
  todayDateString,
} from '../services/examAttendanceService';
import { getExamSubjects } from '../services/examScheduleService';
import { getMyCenterSchools, getMyCenterSummary } from '../services/supervisorMeService';
import { fetchAllCenterStudentsForSchool } from '../services/attendanceStudentService';
import { getApiErrorMessage } from '../services/apiClient';
import { getMyCenterAttendanceStats } from '../services/attendanceStatsService';
import { catalogLevelFromCenter } from '../utils/supervisorCenter';
import {
  buildSubjectProgressMap,
  getSubjectAttendanceProgress,
} from '../utils/subjectAttendanceStatus';
import {
  buildAttendanceClassGroups,
  resolveSchoolLevelForClasses,
} from '../utils/attendanceClassGroups';
import { CenterAttendanceStats, ExamSubject, School, Student } from '../types';

type Step = 'selectSubject' | 'attendance';

export function SupervisorAttendanceScreen() {
  const [step, setStep] = useState<Step>('selectSubject');
  const [centerName, setCenterName] = useState('');
  const [centerLevel, setCenterLevel] = useState<'Primary' | 'Secondary'>('Primary');
  const [centerRegion, setCenterRegion] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | undefined>();
  const [catalogSubjects, setCatalogSubjects] = useState<ExamSubject[]>([]);
  const [attendanceStats, setAttendanceStats] = useState<CenterAttendanceStats | null>(null);
  const [loadingCenter, setLoadingCenter] = useState(true);

  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedClassNumber, setSelectedClassNumber] = useState<number | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(todayDateString());
  const [subject, setSubject] = useState('');
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listGenerated, setListGenerated] = useState(false);

  const schoolOptions = useMemo(() => buildCenterSchoolFilterOptions(schools), [schools]);
  const selectedSchool = schools.find((s) => s.schoolId === selectedSchoolId);

  const schoolLevelForClasses = resolveSchoolLevelForClasses(
    selectedSchool?.schoolLevel,
    centerLevel
  );

  const classGroups = useMemo(
    () => buildAttendanceClassGroups(students, schoolLevelForClasses),
    [students, schoolLevelForClasses]
  );

  const visibleStudents = useMemo(() => {
    const group = classGroups.find((g) => g.classNumber === selectedClassNumber);
    return group?.students ?? [];
  }, [classGroups, selectedClassNumber]);

  const presentCount = useMemo(
    () => visibleStudents.filter((s) => presentMap[s.studentNo] !== false).length,
    [visibleStudents, presentMap]
  );

  const allPresent = visibleStudents.length > 0 && presentCount === visibleStudents.length;

  const subjectProgress = useMemo(
    () =>
      buildSubjectProgressMap(
        attendanceStats,
        catalogSubjects.map((s) => s.subjectName),
        attendanceDate
      ),
    [attendanceStats, attendanceDate, catalogSubjects]
  );

  const refreshAttendanceStats = useCallback(async (): Promise<CenterAttendanceStats | null> => {
    try {
      const stats = await getMyCenterAttendanceStats();
      setAttendanceStats(stats);
      return stats;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoadingCenter(true);
      setError(null);
      try {
        const summary = await getMyCenterSummary();
        const level = catalogLevelFromCenter(summary.level);
        setCenterName(summary.centerName || summary.assignment?.centerName || 'My exam center');
        setCenterLevel(level);
        setCenterRegion(summary.region || summary.assignment?.region || null);
        setAcademicYear(summary.academicYear || summary.assignment?.academicYear);

        const subjects = await getExamSubjects({
          level,
          academicYear: summary.academicYear || summary.assignment?.academicYear,
        });
        setCatalogSubjects(subjects);
        await refreshAttendanceStats();
      } catch (e: unknown) {
        setError(getApiErrorMessage(e, 'Failed to load your exam center'));
      } finally {
        setLoadingCenter(false);
      }
    })();
  }, [refreshAttendanceStats]);

  useFocusEffect(
    useCallback(() => {
      refreshAttendanceStats();
    }, [refreshAttendanceStats])
  );

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      const rows = await getMyCenterSchools();
      setSchools(rows);
      if (rows.length === 1) {
        setSelectedSchoolId(rows[0].schoolId);
      }
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Failed to load schools in your center'));
    } finally {
      setLoadingSchools(false);
    }
  }, []);

  const handleContinueToAttendance = useCallback(async () => {
    setStep('attendance');
    setError(null);
    setStudents([]);
    setListGenerated(false);
    setPresentMap({});
    await loadSchools();
  }, [loadSchools]);

  const handleChangeSubject = () => {
    setStep('selectSubject');
    setStudents([]);
    setListGenerated(false);
    setPresentMap({});
    setSelectedSchoolId(null);
    setSelectedClassNumber(null);
    refreshAttendanceStats();
  };

  const applyPresentDefaults = useCallback(
    async (rows: Student[]) => {
      if (!subject.trim() || !attendanceDate.trim() || !rows.length) {
        const defaults: Record<string, boolean> = {};
        for (const s of rows) defaults[s.studentNo] = true;
        setPresentMap((prev) => ({ ...defaults, ...prev }));
        return;
      }
      try {
        const map = await getExamAttendanceMapForSession(
          subject,
          attendanceDate,
          rows.map((s) => s.studentNo)
        );
        const next: Record<string, boolean> = {};
        for (const s of rows) {
          next[s.studentNo] = map.get(s.studentNo)?.status !== 'Absent';
        }
        setPresentMap((prev) => ({ ...prev, ...next }));
      } catch {
        const defaults: Record<string, boolean> = {};
        for (const s of rows) defaults[s.studentNo] = true;
        setPresentMap((prev) => ({ ...defaults, ...prev }));
      }
    },
    [attendanceDate, subject]
  );

  const loadStudents = useCallback(async () => {
      if (!selectedSchoolId) {
        setError('Select a school first');
        return;
      }
      if (!subject.trim() || !attendanceDate.trim()) {
        setError('Select exam subject and date first');
        return;
      }
      setLoadingStudents(true);
      setError(null);
      try {
        const rows = await fetchAllCenterStudentsForSchool(selectedSchoolId);
        setStudents(rows);
        const groups = buildAttendanceClassGroups(rows, schoolLevelForClasses);
        setSelectedClassNumber(groups[0]?.classNumber ?? null);
        setTotalCount(rows.length);
        setListGenerated(true);
        await applyPresentDefaults(rows);
      } catch (e: unknown) {
        setError(getApiErrorMessage(e, 'Failed to load students for this school'));
      } finally {
        setLoadingStudents(false);
      }
    },
    [applyPresentDefaults, attendanceDate, schoolLevelForClasses, selectedSchoolId, subject]
  );

  const togglePresent = (studentNo: string) => {
    setPresentMap((prev) => ({ ...prev, [studentNo]: prev[studentNo] === false }));
  };

  const toggleAllPresent = () => {
    const nextValue = !allPresent;
    setPresentMap((prev) => {
      const next = { ...prev };
      for (const s of visibleStudents) next[s.studentNo] = nextValue;
      return next;
    });
  };

  const handleSave = async () => {
    if (!listGenerated || !visibleStudents.length) {
      setError('Load students before saving');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveBulkExamAttendance(
        visibleStudents.map((s) => ({
          studentNo: s.studentNo,
          present: presentMap[s.studentNo] !== false,
        })),
        subject,
        attendanceDate
      );
      const latestStats = await refreshAttendanceStats();
      const progress = getSubjectAttendanceProgress(latestStats, subject, attendanceDate);
      const totalInCenter = latestStats?.summary.totalStudentsInCenter ?? 0;
      const subjectRow = latestStats?.bySubject.find(
        (row) => row.subject === subject && row.examDate === attendanceDate
      );
      const markedCount = subjectRow?.students ?? 0;
      const completionNote =
        progress === 'complete' || (totalInCenter > 0 && markedCount >= totalInCenter)
          ? '\n\nAll students in your center are now marked for this subject.'
          : totalInCenter > 0
            ? `\n\nCenter progress: ${markedCount} of ${totalInCenter} students marked for this subject.`
            : '';
      Alert.alert(
        'Saved',
        `Class ${selectedClassNumber ?? '—'}\n${presentCount} present, ${visibleStudents.length - presentCount} absent\n${selectedSchool?.schoolName || 'School'}\n${subject} · ${attendanceDate}${completionNote}`
      );
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Could not save attendance'));
    } finally {
      setSaving(false);
    }
  };

  const studentColumns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 44,
        align: 'center' as const,
        render: (_: Student, i: number) => <TableText center>{i + 1}</TableText>,
      },
      {
        key: 'studentNo',
        title: 'Student ID',
        width: 100,
        render: (item: Student) => <TableText>{item.registrationNo || item.studentNo}</TableText>,
      },
      {
        key: 'name',
        title: 'Name',
        width: 150,
        render: (item: Student) => <TableText bold>{item.fullName || '—'}</TableText>,
      },
      {
        key: 'present',
        title: 'Present',
        width: 72,
        align: 'center' as const,
        render: (item: Student) => (
          <AttendanceCheckbox
            checked={presentMap[item.studentNo] !== false}
            onToggle={() => togglePresent(item.studentNo)}
          />
        ),
      },
    ],
    [presentMap]
  );

  if (loadingCenter) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (step === 'selectSubject') {
    return (
      <SupervisorExamSubjectStep
        centerName={centerName}
        centerLevel={centerLevel}
        region={centerRegion}
        academicYear={academicYear}
        subjects={catalogSubjects}
        loading={loadingCenter}
        examDate={attendanceDate}
        selectedSubject={subject}
        onExamDateChange={(date) => {
          setAttendanceDate(date);
          setSubject('');
        }}
        onSelectSubject={setSubject}
        onContinue={handleContinueToAttendance}
        confirmOnSelect
        subjectProgress={subjectProgress}
        attendanceStats={attendanceStats}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sessionBanner}>
          <View style={styles.sessionBannerBody}>
            <Text style={styles.sessionBannerLabel}>
              {centerLevel} · {centerName}
            </Text>
            <Text style={styles.sessionBannerSubject}>{subject}</Text>
            <Text style={styles.sessionBannerDate}>{attendanceDate}</Text>
          </View>
          <Pressable onPress={handleChangeSubject}>
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>
        </View>

        <Text style={styles.hint}>
          Select a school in your center, then load students and mark attendance for{' '}
          <Text style={styles.hintBold}>{subject}</Text>.
        </Text>

        <ScopeFilterPanel
          title="Select school"
          showRegion={false}
          showLevel={false}
          regionOptions={[]}
          levelOptions={[]}
          schoolOptions={schoolOptions}
          selectedRegion={null}
          selectedLevel={null}
          selectedSchoolId={selectedSchoolId}
          loadingSchools={loadingSchools}
          onRegionChange={() => {}}
          onLevelChange={() => {}}
          onSchoolChange={(v) => {
            setSelectedSchoolId(v);
            setStudents([]);
            setListGenerated(false);
            setPresentMap({});
            setSelectedClassNumber(null);
          }}
        />

        {selectedSchoolId ? (
          <Text style={styles.classHint}>
            Students grouped into classes (
            {schoolLevelForClasses?.toLowerCase().includes('primary') ||
            schoolLevelForClasses?.toLowerCase().includes('abe')
              ? '30 per class'
              : '20 per class'}
            ). Load the list, then pick Class 1, Class 2, etc.
          </Text>
        ) : null}

        <Pressable
          style={[styles.loadBtn, (!selectedSchoolId || loadingStudents) && styles.disabled]}
          disabled={!selectedSchoolId || loadingStudents}
          onPress={() => loadStudents()}
        >
          <Text style={styles.loadBtnText}>
            {loadingStudents
              ? 'Loading...'
              : selectedSchool
                ? `Load students — ${selectedSchool.schoolName || 'school'}`
                : 'Load students for selected school'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {listGenerated && classGroups.length > 0 ? (
          <AttendanceClassPanel
            schoolLevel={schoolLevelForClasses}
            schoolName={selectedSchool?.schoolName}
            groups={classGroups}
            selectedClassNumber={selectedClassNumber}
            onSelectClass={setSelectedClassNumber}
            totalStudents={students.length}
          />
        ) : null}

        {listGenerated && visibleStudents.length > 0 ? (
          <>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {presentCount} of {visibleStudents.length} present
                {selectedClassNumber ? ` · Class ${selectedClassNumber}` : ''}
                {selectedSchool?.schoolName ? ` · ${selectedSchool.schoolName}` : ''}
              </Text>
              <Pressable onPress={toggleAllPresent}>
                <Text style={styles.toggleAll}>{allPresent ? 'Uncheck all' : 'Check all'}</Text>
              </Pressable>
            </View>
            <DataTable
              title="Exam attendance"
              subtitle={
                selectedClassNumber
                  ? `Class ${selectedClassNumber} · ${subject} · ${visibleStudents.length} students`
                  : `${subject} · ${totalCount} students in this school`
              }
              columns={studentColumns}
              data={visibleStudents}
              keyExtractor={(item) => item.studentNo}
              emptyMessage="No students in this class"
            />
            <Pressable
              style={[styles.saveBtn, saving && styles.disabled]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save attendance'}</Text>
            </Pressable>
          </>
        ) : null}

        {listGenerated && !loadingStudents && students.length === 0 ? (
          <Text style={styles.empty}>No students found for this school.</Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 32 },
  sessionBanner: {
    margin: 12,
    marginBottom: 8,
    padding: 14,
    backgroundColor: colors.primary,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sessionBannerBody: { flex: 1 },
  sessionBannerLabel: { fontSize: 11, fontWeight: '600', color: '#c5cae9' },
  sessionBannerSubject: { marginTop: 4, fontSize: 18, fontWeight: '800', color: colors.white },
  sessionBannerDate: { marginTop: 2, fontSize: 12, color: '#c5cae9' },
  changeLink: { color: colors.white, fontWeight: '700', fontSize: 13, padding: 8 },
  hint: { marginHorizontal: 12, marginBottom: 8, fontSize: 13, color: '#555', lineHeight: 18 },
  hintBold: { fontWeight: '700', color: colors.primary },
  classHint: {
    marginHorizontal: 12,
    marginBottom: 8,
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
  },
  loadBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadBtnText: { color: colors.white, fontWeight: '600', textAlign: 'center' },
  disabled: { opacity: 0.55 },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
  },
  summaryText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#444', marginRight: 8 },
  toggleAll: { color: colors.primary, fontWeight: '700' },
  loadMoreBtn: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  loadMoreText: { color: colors.primary, fontWeight: '600' },
  saveBtn: {
    backgroundColor: '#2e7d32',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontWeight: '700' },
  error: { color: colors.error, textAlign: 'center', margin: 8 },
  empty: { textAlign: 'center', color: colors.textSecondary, margin: 16 },
});
