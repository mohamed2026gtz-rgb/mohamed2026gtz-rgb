import React, { useCallback, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatCard } from '../components/StatCard';
import { LevelBreakdown } from '../components/LevelBreakdown';
import { RegionSummary } from '../components/RegionSummary';
import { AttendancePercentBreakdown } from '../components/AttendancePercentBreakdown';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats } from '../services/dashboardService';
import { getAdminAttendanceStats } from '../services/attendanceStatsService';
import { isScopedStaff, isSchoolScopeUser, isSchoolOrSchoolLevelScope, AdminAttendanceStats, DashboardStats } from '../types';
import { DashboardStackParamList, RootTabParamList } from '../navigation/types';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';

type DashboardNav = CompositeNavigationProp<
  NativeStackNavigationProp<DashboardStackParamList>,
  BottomTabNavigationProp<RootTabParamList>
>;

export function DashboardScreen() {
  const navigation = useNavigation<DashboardNav>();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AdminAttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    const scopedStaff = isScopedStaff(user);
    const singleSchoolId =
      user?.accessScope?.scopeType === 'school' && user.accessScope.schoolIds?.length === 1
        ? user.accessScope.schoolIds[0]
        : undefined;
    const statsSchoolId = scopedStaff ? singleSchoolId : user?.schoolId;
    try {
      const [data, attendance] = await Promise.all([
        getDashboardStats(statsSchoolId),
        getAdminAttendanceStats(statsSchoolId).catch(() => null),
      ]);
      setStats(data);
      setAttendanceStats(attendance);
    } catch (e: unknown) {
      setError((e as Error).message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const scopeSummary = user?.accessScope?.scopeType
    ? [
        user.accessScope.scopeType.replace('_', ' '),
        user.accessScope.regionName,
        user.accessScope.districtName,
        user.accessScope.schoolLevel,
        user.accessScope.schoolCount != null ? `${user.accessScope.schoolCount} schools` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const schoolScopeOnly = isSchoolScopeUser(user);
  const schoolOrLevelScope = isSchoolOrSchoolLevelScope(user);

  if (loading && !stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
    >
      <View style={styles.welcome}>
        <Text style={styles.welcomeTitle}>
          Welcome, {user?.fullName || user?.userName || 'User'}
        </Text>
        {user?.schoolId != null && !isScopedStaff(user) ? (
          <Text style={styles.meta}>School ID: {user.schoolId}</Text>
        ) : null}
        {scopeSummary ? <Text style={styles.meta}>Access: {scopeSummary}</Text> : null}
        {user?.roles?.length ? (
          <Text style={styles.meta}>Role: {user.roles.join(', ')}</Text>
        ) : null}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.grid}>
        <StatCard title="Students" value={String(stats?.totalStudents ?? 0)} color="#1565c0" />
        <StatCard title="Schools" value={String(stats?.totalSchools ?? 0)} color="#00838f" />
        {!schoolScopeOnly ? (
          <StatCard title="Teachers" value={String(stats?.totalTeachers ?? 0)} color="#6a1b9a" />
        ) : null}
        <StatCard
          title="With Photo"
          value={String(stats?.studentsWithPicture ?? 0)}
          color="#ef6c00"
        />
      </View>

      <LevelBreakdown
        title="Schools by level"
        items={stats?.schoolsByLevel ?? []}
        accent="#00838f"
      />
      <LevelBreakdown
        title="Students by school level"
        items={stats?.studentsBySchoolLevel ?? []}
        accent="#1565c0"
      />
      <LevelBreakdown
        title="Students with photo by school level"
        items={stats?.studentsWithPictureBySchoolLevel ?? []}
        accent="#ef6c00"
      />

      {!schoolScopeOnly ? (
        <RegionSummary items={stats?.regionsSummary ?? []} />
      ) : null}

      {attendanceStats ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Exam attendance overview</Text>
            <Text style={styles.sectionSubtitle}>
              {schoolOrLevelScope
                ? 'Exam attendance for schools in your access scope'
                : 'Student exam attendance across regions, levels, and exam days'}
            </Text>
          </View>

          <View style={styles.grid}>
            <StatCard
              title="Students recorded"
              value={String(attendanceStats.summary.studentsWithRecords)}
              color="#2e7d32"
            />
            <StatCard
              title="Present rate"
              value={`${attendanceStats.summary.attendancePercent.toFixed(1)}%`}
              color="#1565c0"
            />
            <StatCard
              title="Exam days"
              value={String(attendanceStats.summary.examDaysRecorded)}
              color="#6a1b9a"
            />
            <StatCard
              title="Coverage"
              value={`${attendanceStats.summary.coveragePercent.toFixed(1)}%`}
              color="#ef6c00"
            />
          </View>

          {!schoolScopeOnly ? (
            <AttendancePercentBreakdown
              title="Attendance by region"
              accent="#1565c0"
              rows={attendanceStats.byRegion.map((row) => ({
                key: row.region,
                label: row.region,
                subtitle: `${row.studentsWithRecords}/${row.totalStudents} students · ${row.attendedCount} present / ${row.absentCount} absent`,
                percent: row.attendancePercent,
                valueLabel: `${row.attendancePercent.toFixed(1)}%`,
              }))}
            />
          ) : null}

          <AttendancePercentBreakdown
            title="Attendance by school level"
            accent="#00838f"
            rows={attendanceStats.byLevel.map((row) => ({
              key: row.level,
              label: row.level,
              subtitle: `${row.studentsWithRecords}/${row.totalStudents} students · coverage ${row.coveragePercent.toFixed(1)}%`,
              percent: row.attendancePercent,
              valueLabel: `${row.attendancePercent.toFixed(1)}%`,
            }))}
          />

          <AttendancePercentBreakdown
            title="Attendance by exam day"
            accent="#6a1b9a"
            rows={attendanceStats.byExamDay.map((row) => ({
              key: row.examDate,
              label: row.examDate,
              subtitle: `${row.students} students · ${row.subjects} subjects · ${row.attendedCount} present / ${row.absentCount} absent`,
              percent: row.attendancePercent,
            }))}
          />

          <AttendancePercentBreakdown
            title={schoolOrLevelScope ? 'Exam centers (your schools)' : 'Supervisor centers (attendance recorded)'}
            accent={colors.primary}
            rows={attendanceStats.bySupervisorCenter.map((row) => ({
              key: `${row.centerName}-${row.supervisorName}`,
              label: row.centerName,
              subtitle: `${row.supervisorName} · ${row.level}${row.region ? ` · ${row.region}` : ''} · ${row.studentsWithRecords} students`,
              percent: row.attendancePercent,
            }))}
            emptyMessage={
              schoolOrLevelScope
                ? 'No exam attendance recorded for your schools yet'
                : 'No supervisor center attendance recorded yet'
            }
          />
        </>
      ) : null}

      <Pressable style={styles.actionButton} onPress={() => navigation.navigate('Schools')}>
        <Text style={styles.actionButtonText}>Browse schools by region & level</Text>
      </Pressable>

      <Pressable
        style={[styles.actionButton, styles.secondaryAction]}
        onPress={() => navigation.navigate('Students', { screen: 'StudentBrowse' })}
      >
        <Text style={styles.actionButtonText}>Generate student list by filters</Text>
      </Pressable>

      <Pressable
        style={[styles.actionButton, styles.secondaryAction]}
        onPress={() => navigation.navigate('StudentPhoto', {})}
      >
        <Text style={styles.actionButtonText}>View student photo by unique ID</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  welcome: {
    backgroundColor: colors.surface,
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  welcomeTitle: { fontSize: 20, fontWeight: '700', color: colors.text },
  meta: { marginTop: 6, color: colors.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  sectionHeader: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.primary },
  sectionSubtitle: { marginTop: 4, fontSize: 12, color: colors.textSecondary, lineHeight: 18 },
  error: { color: colors.error, textAlign: 'center', margin: 16 },
  actionButton: {
    backgroundColor: colors.primary,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 4,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
  },
  secondaryAction: { backgroundColor: '#3949ab', marginTop: 0 },
  actionButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
});
