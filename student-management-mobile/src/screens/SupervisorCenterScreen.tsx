import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { DataTable, TableText } from '../components/DataTable';
import {
  getMyCenterSchools,
  getMyCenterStudents,
  getMyCenterSummary,
  getMySupervisorAssignment,
} from '../services/supervisorMeService';
import { getMyCenterAttendanceStats } from '../services/attendanceStatsService';
import { AttendancePercentBreakdown } from '../components/AttendancePercentBreakdown';
import { CenterAttendanceStats, ExamCenterSummary, School, Student, SupervisorAssignment } from '../types';
import { SupervisorStudentIdModal } from '../components/SupervisorStudentIdModal';

type Tab = 'dashboard' | 'schools' | 'students';

export function SupervisorCenterScreen() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<ExamCenterSummary | null>(null);
  const [localAssignment, setLocalAssignment] = useState<SupervisorAssignment | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [attendanceStats, setAttendanceStats] = useState<CenterAttendanceStats | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idCardStudentNo, setIdCardStudentNo] = useState<string | null>(null);

  const assignment = user?.supervisorAssignment || localAssignment;

  useEffect(() => {
    if (user?.supervisorAssignment) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getMySupervisorAssignment();
        if (!cancelled) setLocalAssignment(data);
      } catch {
        // Assignment unavailable — summary load will show the error.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.supervisorAssignment]);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      const data = await getMyCenterSummary();
      setSummary(data);
    } catch {
      setError('No exam center assigned yet. Contact administration.');
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      setSchools(await getMyCenterSchools(schoolSearch.trim() || undefined));
    } catch {
      setError('Failed to load schools for your center');
    } finally {
      setLoadingSchools(false);
    }
  }, [schoolSearch]);

  const loadStudents = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoadingStudents(true);
      else setLoadingMore(true);
      try {
        const result = await getMyCenterStudents({
          page: pageNum,
          pageSize: 50,
          search: studentSearch.trim() || undefined,
        });
        setStudents((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch {
        setError('Failed to load students for your center');
      } finally {
        setLoadingStudents(false);
        setLoadingMore(false);
      }
    },
    [studentSearch]
  );

  const loadAttendanceStats = useCallback(async () => {
    setLoadingAttendance(true);
    try {
      setAttendanceStats(await getMyCenterAttendanceStats());
    } catch {
      setAttendanceStats(null);
    } finally {
      setLoadingAttendance(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
    loadAttendanceStats();
  }, [loadSummary, loadAttendanceStats]);

  useEffect(() => {
    if (activeTab === 'schools') loadSchools();
  }, [activeTab, loadSchools]);

  const schoolColumns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 40,
        align: 'center' as const,
        render: (_: School, i: number) => <TableText center>{i + 1}</TableText>,
      },
      {
        key: 'name',
        title: 'School',
        width: 200,
        render: (item: School) => <TableText bold>{item.schoolName || '—'}</TableText>,
      },
      {
        key: 'count',
        title: 'Students',
        width: 80,
        align: 'center' as const,
        render: (item: School) => (
          <TableText center bold>
            {item.studentCount ?? '—'}
          </TableText>
        ),
      },
    ],
    []
  );

  const studentColumns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 40,
        align: 'center' as const,
        render: (_: Student, i: number) => <TableText center>{i + 1}</TableText>,
      },
      {
        key: 'studentNo',
        title: 'ID',
        width: 100,
        render: (item: Student) => <TableText>{item.registrationNo || item.studentNo}</TableText>,
      },
      {
        key: 'name',
        title: 'Name',
        width: 160,
        render: (item: Student) => <TableText bold>{item.fullName || '—'}</TableText>,
      },
      {
        key: 'school',
        title: 'School',
        width: 140,
        render: (item: Student) => <TableText muted>{item.schoolName || '—'}</TableText>,
      },
      {
        key: 'view',
        title: 'Card',
        width: 52,
        align: 'center' as const,
        render: (item: Student) => (
          <Pressable onPress={() => setIdCardStudentNo(item.studentNo)}>
            <Text style={styles.viewLink}>View</Text>
          </Pressable>
        ),
      },
    ],
    []
  );

  if (loadingSummary && !summary) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!summary && !assignment) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error || 'No center assignment'}</Text>
      </View>
    );
  }

  const title = summary?.centerName || assignment?.centerName || 'My exam center';

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.roleBadge}>Exam Supervisor</Text>
        <Text style={styles.centerTitle}>{title}</Text>
        <Text style={styles.centerMeta}>
          {[
            summary?.region || assignment?.region,
            summary?.district || assignment?.district,
            summary?.level || assignment?.schoolLevel,
            summary?.academicYear || assignment?.academicYear,
          ]
            .filter(Boolean)
            .join(' · ')}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary?.schoolCount ?? assignment?.schoolCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Schools</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary?.studentCount ?? assignment?.studentCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'dashboard' && styles.tabBtnActive]}
          onPress={() => setActiveTab('dashboard')}
        >
          <Text style={[styles.tabText, activeTab === 'dashboard' && styles.tabTextActive]}>
            Dashboard
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'schools' && styles.tabBtnActive]}
          onPress={() => setActiveTab('schools')}
        >
          <Text style={[styles.tabText, activeTab === 'schools' && styles.tabTextActive]}>Schools</Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'students' && styles.tabBtnActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>Students</Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'dashboard' ? (
          <>
            {loadingAttendance ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : attendanceStats ? (
              <>
                <View style={styles.dashboardGrid}>
                  <View style={styles.dashStat}>
                    <Text style={styles.dashValue}>
                      {attendanceStats.summary.studentsWithRecords}
                    </Text>
                    <Text style={styles.dashLabel}>Students recorded</Text>
                  </View>
                  <View style={styles.dashStat}>
                    <Text style={styles.dashValue}>{attendanceStats.summary.examDaysRecorded}</Text>
                    <Text style={styles.dashLabel}>Exam days</Text>
                  </View>
                  <View style={styles.dashStat}>
                    <Text style={styles.dashValue}>{attendanceStats.summary.subjectsRecorded}</Text>
                    <Text style={styles.dashLabel}>Subjects</Text>
                  </View>
                  <View style={styles.dashStat}>
                    <Text style={styles.dashValue}>
                      {attendanceStats.summary.attendancePercent.toFixed(1)}%
                    </Text>
                    <Text style={styles.dashLabel}>Present rate</Text>
                  </View>
                </View>

                <View style={styles.coverageCard}>
                  <Text style={styles.coverageTitle}>Coverage in your center</Text>
                  <Text style={styles.coverageText}>
                    {attendanceStats.summary.studentsWithRecords} of{' '}
                    {attendanceStats.summary.totalStudentsInCenter ?? '—'} students have attendance
                    recorded ({attendanceStats.summary.coveragePercent.toFixed(1)}%)
                  </Text>
                  <Text style={styles.coverageMeta}>
                    {attendanceStats.summary.totalRecords} total records ·{' '}
                    {attendanceStats.summary.presentCount} present ·{' '}
                    {attendanceStats.summary.absentCount} absent
                  </Text>
                </View>

                <AttendancePercentBreakdown
                  title="Attendance by exam day"
                  accent={colors.primary}
                  rows={attendanceStats.byExamDay.map((day) => ({
                    key: day.examDate,
                    label: day.examDate,
                    subtitle: `${day.students} students · ${day.subjects} subject${day.subjects === 1 ? '' : 's'} · ${day.attendedCount} present / ${day.absentCount} absent`,
                    percent: day.attendancePercent,
                  }))}
                />

                <AttendancePercentBreakdown
                  title="Attendance by subject"
                  accent="#2e7d32"
                  rows={attendanceStats.bySubject.map((item) => ({
                    key: `${item.examDate}-${item.subject}`,
                    label: item.subject,
                    subtitle: `${item.examDate} · ${item.students} students · ${item.attendedCount} present / ${item.absentCount} absent`,
                    percent: item.attendancePercent,
                  }))}
                />
              </>
            ) : (
              <Text style={styles.emptyDash}>
                No attendance recorded yet for your center. Use Exam Attendance to mark students.
              </Text>
            )}
          </>
        ) : activeTab === 'schools' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search schools"
              value={schoolSearch}
              onChangeText={setSchoolSearch}
              onSubmitEditing={() => loadSchools()}
              returnKeyType="search"
            />
            {loadingSchools ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : (
              <DataTable
                title="Schools in your center"
                subtitle={`${schools.length} school${schools.length === 1 ? '' : 's'}`}
                columns={schoolColumns}
                data={schools}
                keyExtractor={(item) => String(item.schoolId)}
                emptyMessage="No schools in this center"
              />
            )}
          </>
        ) : (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search students"
              value={studentSearch}
              onChangeText={setStudentSearch}
              onSubmitEditing={() => loadStudents(1, false)}
              returnKeyType="search"
            />
            <Pressable style={styles.loadBtn} onPress={() => loadStudents(1, false)}>
              <Text style={styles.loadBtnText}>{loadingStudents ? 'Loading...' : 'Load students'}</Text>
            </Pressable>
            {loadingStudents ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : students.length > 0 ? (
              <DataTable
                title="Students in your center"
                subtitle={`${totalCount.toLocaleString()} total · showing ${students.length}`}
                columns={studentColumns}
                data={students}
                keyExtractor={(item) => item.studentNo}
                emptyMessage="No students found"
              />
            ) : null}
            {page < totalPages ? (
              <Pressable
                style={styles.loadMoreBtn}
                disabled={loadingMore}
                onPress={() => loadStudents(page + 1, true)}
              >
                <Text style={styles.loadMoreText}>
                  {loadingMore ? 'Loading...' : `Load more (${students.length} of ${totalCount})`}
                </Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <SupervisorStudentIdModal
        visible={idCardStudentNo != null}
        studentNo={idCardStudentNo}
        examCenterName={title}
        academicYear={summary?.academicYear || assignment?.academicYear}
        onClose={() => setIdCardStudentNo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  scrollContent: { paddingBottom: 24 },
  summaryCard: {
    margin: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.successBg,
    color: colors.success,
    fontWeight: '700',
    fontSize: 11,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
    overflow: 'hidden',
  },
  centerTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  centerMeta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  statsRow: { flexDirection: 'row', marginTop: 16, gap: 12 },
  statBox: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: colors.primary },
  statLabel: { marginTop: 4, fontSize: 12, color: '#555', fontWeight: '600' },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
    padding: 4,
  },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tabBtnActive: { backgroundColor: colors.primary },
  tabText: { fontWeight: '600', color: colors.primary },
  tabTextActive: { color: colors.white },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loadBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  loadBtnText: { color: colors.white, fontWeight: '600' },
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
  viewLink: { color: colors.primary, fontWeight: '700', fontSize: 12, textAlign: 'center' },
  error: { color: colors.error, textAlign: 'center', margin: 8 },
  dashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: 12,
    marginBottom: 8,
    gap: 8,
  },
  dashStat: {
    width: '47%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  dashValue: { fontSize: 24, fontWeight: '800', color: colors.primary },
  dashLabel: { marginTop: 4, fontSize: 11, fontWeight: '600', color: colors.textSecondary, textAlign: 'center' },
  coverageCard: {
    marginHorizontal: 12,
    marginBottom: 12,
    padding: 14,
    backgroundColor: colors.successBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
  },
  coverageTitle: { fontSize: 14, fontWeight: '700', color: colors.success },
  coverageText: { marginTop: 6, fontSize: 13, color: '#333', lineHeight: 18 },
  coverageMeta: { marginTop: 4, fontSize: 11, color: colors.textSecondary },
  emptyDash: { margin: 16, fontSize: 13, color: colors.textSecondary, lineHeight: 20, textAlign: 'center' },
});
