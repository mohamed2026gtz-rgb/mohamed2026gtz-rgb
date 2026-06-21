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
import { RouteProp, useRoute } from '@react-navigation/native';
import { DataTable, TableText } from '../components/DataTable';
import {
  getExamCenterSchools,
  getExamCenterStudents,
  getExamCenterSummary,
} from '../services/examCenterService';
import { ExamCenterSummary, School, Student } from '../types';
import { SupervisorsStackParamList } from '../navigation/types';

type Route = RouteProp<SupervisorsStackParamList, 'ExamCenterDetail'>;
type DetailTab = 'schools' | 'students';

export function ExamCenterDetailScreen() {
  const { level, centerId, centerName } = useRoute<Route>().params;
  const [summary, setSummary] = useState<ExamCenterSummary | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTab>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingSchools, setLoadingSchools] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoadingSummary(true);
    setError(null);
    try {
      setSummary(await getExamCenterSummary(level, centerId));
    } catch {
      setError('Failed to load exam center summary');
    } finally {
      setLoadingSummary(false);
    }
  }, [centerId, level]);

  const loadSchools = useCallback(async () => {
    setLoadingSchools(true);
    try {
      setSchools(await getExamCenterSchools(level, centerId, schoolSearch.trim() || undefined));
    } catch {
      setError('Failed to load schools for this center');
    } finally {
      setLoadingSchools(false);
    }
  }, [centerId, level, schoolSearch]);

  const loadStudents = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoadingStudents(true);
      else setLoadingMore(true);
      try {
        const result = await getExamCenterStudents(level, centerId, {
          page: pageNum,
          pageSize: 50,
          search: studentSearch.trim() || undefined,
        });
        setStudents((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotalPages(result.totalPages);
        setTotalCount(result.totalCount);
      } catch {
        setError('Failed to load students for this center');
      } finally {
        setLoadingStudents(false);
        setLoadingMore(false);
      }
    },
    [centerId, level, studentSearch]
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
        key: 'schoolNo',
        title: 'School No',
        width: 96,
        render: (item: School) => <TableText>{item.schoolNumber || '—'}</TableText>,
      },
      {
        key: 'name',
        title: 'School Name',
        width: 180,
        render: (item: School) => <TableText bold>{item.schoolName || '—'}</TableText>,
      },
      {
        key: 'region',
        title: 'Region',
        width: 100,
        render: (item: School) => <TableText muted>{item.region || '—'}</TableText>,
      },
      {
        key: 'count',
        title: 'Students',
        width: 80,
        align: 'center' as const,
        render: (item: School) => (
          <TableText center bold>
            {item.studentCount != null ? item.studentCount : '—'}
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
        title: 'Student No',
        width: 100,
        render: (item: Student) => (
          <TableText>{item.registrationNo || item.studentNo}</TableText>
        ),
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
        key: 'sex',
        title: 'Sex',
        width: 56,
        align: 'center' as const,
        render: (item: Student) => <TableText center>{item.sex || '—'}</TableText>,
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

  const title = summary?.centerName || centerName || 'Exam Center';

  return (
    <View style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.centerTitle}>{title}</Text>
        <Text style={styles.centerMeta}>
          {[summary?.region, summary?.level, summary?.academicYear].filter(Boolean).join(' · ')}
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary?.schoolCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Schools</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary?.studentCount ?? '—'}</Text>
            <Text style={styles.statLabel}>Students</Text>
          </View>
        </View>
      </View>

      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tabBtn, activeTab === 'schools' && styles.tabBtnActive]}
          onPress={() => setActiveTab('schools')}
        >
          <Text style={[styles.tabText, activeTab === 'schools' && styles.tabTextActive]}>
            Schools
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tabBtn, activeTab === 'students' && styles.tabBtnActive]}
          onPress={() => setActiveTab('students')}
        >
          <Text style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}>
            Students
          </Text>
        </Pressable>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'schools' ? (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search schools in this center"
              value={schoolSearch}
              onChangeText={setSchoolSearch}
              onSubmitEditing={() => loadSchools()}
              returnKeyType="search"
            />
            {loadingSchools ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : (
              <DataTable
                title="Schools in center"
                subtitle={`${schools.length} school${schools.length === 1 ? '' : 's'}`}
                columns={schoolColumns}
                data={schools}
                keyExtractor={(item) => String(item.schoolId)}
                emptyMessage="No schools found for this center"
              />
            )}
          </>
        ) : (
          <>
            <TextInput
              style={styles.search}
              placeholder="Search students in this center"
              value={studentSearch}
              onChangeText={setStudentSearch}
              onSubmitEditing={() => loadStudents(1, false)}
              returnKeyType="search"
            />
            <Pressable style={styles.loadBtn} onPress={() => loadStudents(1, false)}>
              <Text style={styles.loadBtnText}>
                {loadingStudents ? 'Loading...' : 'Load students'}
              </Text>
            </Pressable>
            {loadingStudents ? (
              <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
            ) : students.length > 0 ? (
              <DataTable
                title="Students in center"
                subtitle={`${totalCount.toLocaleString()} student${totalCount === 1 ? '' : 's'} · showing ${students.length}`}
                columns={studentColumns}
                data={students}
                keyExtractor={(item) => item.studentNo}
                emptyMessage="No students found for this center"
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingBottom: 24 },
  summaryCard: {
    margin: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
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
  error: { color: colors.error, textAlign: 'center', margin: 8 },
});
