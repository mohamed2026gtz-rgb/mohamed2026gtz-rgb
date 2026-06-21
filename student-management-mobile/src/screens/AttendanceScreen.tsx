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
import { AttendanceCheckbox } from '../components/AttendanceCheckbox';
import { AttendanceClassPanel } from '../components/AttendanceClassPanel';
import { DataTable, TableText } from '../components/DataTable';
import { ScopeFilterPanel } from '../components/ScopeFilterPanel';
import { ExamSessionPicker } from '../components/ExamSessionPicker';
import {
  buildLevelFilterOptions,
  buildRegionFilterOptions,
  buildSchoolFilterOptions,
} from '../utils/filterOptions';
import {
  getExamAttendanceMapForSession,
  saveBulkExamAttendance,
  todayDateString,
} from '../services/examAttendanceService';
import { getRegions } from '../services/regionService';
import { getSchoolLevels, getSchools } from '../services/schoolService';
import { getStudents } from '../services/studentService';
import { fetchAllStudentsForAttendance } from '../services/attendanceStudentService';
import {
  buildAttendanceClassGroups,
  resolveSchoolLevelForClasses,
} from '../utils/attendanceClassGroups';
import { Region, School, Student } from '../types';

export function AttendanceScreen() {
  const [regions, setRegions] = useState<Region[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null);
  const [attendanceDate, setAttendanceDate] = useState(todayDateString());
  const [subject, setSubject] = useState('');
  const [presentMap, setPresentMap] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listGenerated, setListGenerated] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [selectedClassNumber, setSelectedClassNumber] = useState<number | null>(null);
  const [useClassGroups, setUseClassGroups] = useState(false);

  const regionOptions = useMemo(() => buildRegionFilterOptions(regions), [regions]);
  const levelOptions = useMemo(() => buildLevelFilterOptions(levels), [levels]);
  const schoolOptions = useMemo(() => buildSchoolFilterOptions(schools), [schools]);
  const selectedSchool = schools.find((s) => s.schoolId === selectedSchoolId);

  const schoolLevelForClasses = resolveSchoolLevelForClasses(
    selectedSchool?.schoolLevel,
    selectedLevel
  );

  const classGroups = useMemo(
    () => (useClassGroups ? buildAttendanceClassGroups(allStudents, schoolLevelForClasses) : []),
    [allStudents, schoolLevelForClasses, useClassGroups]
  );

  const visibleStudents = useMemo(() => {
    if (!useClassGroups) return students;
    const group = classGroups.find((g) => g.classNumber === selectedClassNumber);
    return group?.students ?? [];
  }, [classGroups, selectedClassNumber, students, useClassGroups]);

  const presentCount = useMemo(
    () => visibleStudents.filter((s) => presentMap[s.studentNo] !== false).length,
    [visibleStudents, presentMap]
  );

  const allPresent =
    visibleStudents.length > 0 && presentCount === visibleStudents.length;

  useEffect(() => {
    (async () => {
      try {
        const [regionRows, levelRows] = await Promise.all([getRegions(), getSchoolLevels()]);
        setRegions(regionRows);
        setLevels(levelRows);
      } catch {
        setError('Failed to load regions and levels');
      } finally {
        setLoadingFilters(false);
      }
    })();
  }, []);

  const loadSchoolOptions = useCallback(async () => {
    if (!selectedRegion) {
      setSchools([]);
      setSelectedSchoolId(null);
      return;
    }
    try {
      const rows = await getSchools({
        region: selectedRegion,
        level: selectedLevel || undefined,
      });
      setSchools(rows);
      if (selectedSchoolId && !rows.some((s) => s.schoolId === selectedSchoolId)) {
        setSelectedSchoolId(null);
      }
    } catch {
      setError('Failed to load schools for selected filters');
    }
  }, [selectedLevel, selectedRegion, selectedSchoolId]);

  useEffect(() => {
    loadSchoolOptions();
    setListGenerated(false);
    setStudents([]);
    setAllStudents([]);
    setSelectedClassNumber(null);
    setUseClassGroups(false);
    setPresentMap({});
  }, [loadSchoolOptions, selectedRegion, selectedLevel]);

  const applyPresentDefaults = useCallback(
    async (items: Student[]) => {
      const trimmedSubject = subject.trim();
      const trimmedDate = attendanceDate.trim();
      const next: Record<string, boolean> = {};

      if (trimmedSubject && trimmedDate) {
        const saved = await getExamAttendanceMapForSession(
          trimmedSubject,
          trimmedDate,
          items.map((s) => s.studentNo)
        );
        for (const student of items) {
          const record = saved.get(student.studentNo);
          next[student.studentNo] = record ? record.status === 'Present' : true;
        }
      } else {
        for (const student of items) {
          next[student.studentNo] = true;
        }
      }

      setPresentMap((prev) => ({ ...prev, ...next }));
    },
    [attendanceDate, subject]
  );

  const generateList = useCallback(
    async (pageNum = 1, append = false) => {
      if (!selectedRegion) {
        setError('Select a region first');
        return;
      }
      if (!subject.trim()) {
        setError('Select an exam subject from the timetable');
        return;
      }
      if (!attendanceDate.trim()) {
        setError('Enter the attendance date (YYYY-MM-DD)');
        return;
      }

      if (pageNum === 1) setLoadingStudents(true);
      else setLoadingMore(true);
      setError(null);

      try {
        if (selectedSchoolId) {
          const rows = await fetchAllStudentsForAttendance({
            region: selectedRegion,
            level: selectedLevel || undefined,
            schoolId: selectedSchoolId,
          });
          setAllStudents(rows);
          setStudents(rows);
          setUseClassGroups(true);
          const groups = buildAttendanceClassGroups(rows, schoolLevelForClasses);
          setSelectedClassNumber(groups[0]?.classNumber ?? null);
          setPage(1);
          setTotalPages(1);
          setTotalCount(rows.length);
          setListGenerated(true);
          await applyPresentDefaults(rows);
          return;
        }

        const result = await getStudents({
          page: pageNum,
          pageSize: 50,
          region: selectedRegion,
          level: selectedLevel || undefined,
          schoolId: selectedSchoolId || undefined,
        });

        setStudents((prev) => (append ? [...prev, ...result.items] : result.items));
        setAllStudents([]);
        setUseClassGroups(false);
        setSelectedClassNumber(null);
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
        setListGenerated(true);
        await applyPresentDefaults(result.items);
      } catch {
        setError('Failed to load student list');
      } finally {
        setLoadingStudents(false);
        setLoadingMore(false);
      }
    },
    [applyPresentDefaults, attendanceDate, schoolLevelForClasses, selectedLevel, selectedRegion, selectedSchoolId, subject]
  );

  const toggleAllPresent = () => {
    const nextValue = !allPresent;
    setPresentMap((prev) => {
      const next = { ...prev };
      for (const student of visibleStudents) {
        next[student.studentNo] = nextValue;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!listGenerated || visibleStudents.length === 0) {
      setError('Load students before saving attendance');
      return;
    }
    if (!subject.trim() || !attendanceDate.trim()) {
      setError('Subject and attendance date are required');
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
      const classLabel =
        useClassGroups && selectedClassNumber ? `Class ${selectedClassNumber}\n` : '';
      Alert.alert(
        'Attendance saved',
        `${classLabel}Saved to server database.\n${presentCount} present, ${visibleStudents.length - presentCount} absent\n${subject} · ${attendanceDate}`
      );
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Could not save attendance to server');
    } finally {
      setSaving(false);
    }
  };

  const togglePresent = (studentNo: string) => {
    setPresentMap((prev) => ({
      ...prev,
      [studentNo]: prev[studentNo] === false,
    }));
  };

  const studentColumns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 44,
        align: 'center' as const,
        render: (_: Student, rowIndex: number) => (
          <TableText center>{rowIndex + 1}</TableText>
        ),
      },
      {
        key: 'studentNo',
        title: 'Student No',
        width: 100,
        render: (item: Student) => (
          <TableText>{item.registrationNo || item.studentNo}</TableText>
        ),
      },
      {
        key: 'name',
        title: 'Student Name',
        width: 160,
        render: (item: Student) => <TableText bold>{item.fullName || '—'}</TableText>,
      },
      {
        key: 'sex',
        title: 'Sex',
        width: 56,
        align: 'center' as const,
        render: (item: Student) => <TableText center>{item.sex || '—'}</TableText>,
      },
      {
        key: 'school',
        title: 'School',
        width: 130,
        render: (item: Student) => <TableText muted>{item.schoolName || '—'}</TableText>,
      },
      {
        key: 'present',
        title: 'Actions',
        width: 80,
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

  if (loadingFilters) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScopeFilterPanel
          regionOptions={regionOptions}
          levelOptions={levelOptions}
          schoolOptions={schoolOptions}
          selectedRegion={selectedRegion}
          selectedLevel={selectedLevel}
          selectedSchoolId={selectedSchoolId}
          onRegionChange={(v) => {
            setSelectedRegion(v);
            setSelectedSchoolId(null);
            setListGenerated(false);
          }}
          onLevelChange={(v) => {
            setSelectedLevel(v);
            setListGenerated(false);
          }}
          onSchoolChange={(v) => {
            setSelectedSchoolId(v);
            setListGenerated(false);
            setAllStudents([]);
            setSelectedClassNumber(null);
            setUseClassGroups(false);
          }}
        />

        {selectedSchoolId ? (
          <Text style={styles.classHint}>
            School selected — students will be split into classes (
            {schoolLevelForClasses?.toLowerCase().includes('primary') ||
            schoolLevelForClasses?.toLowerCase().includes('abe')
              ? '30 per class for Primary / ABE'
              : '20 per class for Secondary'}
            ).
          </Text>
        ) : null}

        <View style={styles.fieldBox}>
          <Text style={styles.fieldLabel}>Attendance date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.fieldInput}
            placeholder="2026-06-12"
            value={attendanceDate}
            onChangeText={(v) => {
              setAttendanceDate(v);
              setSubject('');
              setListGenerated(false);
            }}
          />
        </View>

        <ExamSessionPicker
          schoolLevel={selectedLevel}
          examDate={attendanceDate}
          selectedSubject={subject}
          onSelect={(value) => {
            setSubject(value);
            setListGenerated(false);
          }}
        />

        <Pressable
          style={[
            styles.loadBtn,
            (!selectedRegion || !selectedLevel || !subject.trim() || !attendanceDate.trim()) &&
              styles.loadBtnDisabled,
          ]}
          disabled={
            !selectedRegion || !selectedLevel || !subject.trim() || !attendanceDate.trim() || loadingStudents
          }
          onPress={() => generateList(1, false)}
        >
          <Text style={styles.loadBtnText}>
            {loadingStudents ? 'Loading students...' : 'Load students for attendance'}
          </Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {useClassGroups && classGroups.length > 0 ? (
          <AttendanceClassPanel
            schoolLevel={schoolLevelForClasses}
            schoolName={selectedSchool?.schoolName}
            groups={classGroups}
            selectedClassNumber={selectedClassNumber}
            onSelectClass={setSelectedClassNumber}
            totalStudents={allStudents.length}
          />
        ) : null}

        {listGenerated && visibleStudents.length > 0 ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {presentCount} of {visibleStudents.length} marked present
              {useClassGroups && selectedClassNumber ? ` · Class ${selectedClassNumber}` : ''}
              {' · '}unchecked = absent
            </Text>
            <Pressable onPress={toggleAllPresent}>
              <Text style={styles.toggleAll}>{allPresent ? 'Uncheck all' : 'Check all'}</Text>
            </Pressable>
          </View>
        ) : null}

        {listGenerated && !loadingStudents ? (
          <DataTable
            title="Student attendance"
            subtitle={
              useClassGroups && selectedClassNumber
                ? `Class ${selectedClassNumber} · ${subject} · ${attendanceDate} · ${visibleStudents.length} students`
                : `${subject} · ${attendanceDate} · ${totalCount.toLocaleString()} student${totalCount === 1 ? '' : 's'}`
            }
            columns={studentColumns}
            data={visibleStudents}
            keyExtractor={(item) => item.studentNo}
            emptyMessage="No students for these filters"
          />
        ) : null}

        {loadingStudents ? (
          <ActivityIndicator style={{ marginVertical: 24 }} color={colors.primary} />
        ) : null}

        {listGenerated && !useClassGroups && page < totalPages ? (
          <Pressable
            style={styles.loadMoreBtn}
            disabled={loadingMore}
            onPress={() => generateList(page + 1, true)}
          >
            <Text style={styles.loadMoreText}>
              {loadingMore ? 'Loading...' : `Load more (${students.length} of ${totalCount})`}
            </Text>
          </Pressable>
        ) : null}

        {listGenerated && visibleStudents.length > 0 ? (
          <Pressable
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'Saving...' : 'Save attendance for this list'}
            </Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  fieldBox: {
    marginHorizontal: 12,
    marginBottom: 10,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  classHint: {
    marginHorizontal: 16,
    marginBottom: 10,
    fontSize: 12,
    color: colors.primary,
    lineHeight: 18,
  },
  fieldInput: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  loadBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadBtnDisabled: { opacity: 0.5 },
  loadBtnText: { color: colors.white, fontWeight: '600' },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 12,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  summaryText: { flex: 1, fontSize: 13, color: '#444', fontWeight: '600' },
  toggleAll: { color: colors.primary, fontWeight: '700', fontSize: 13 },
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
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  error: { color: colors.error, textAlign: 'center', margin: 8 },
});
