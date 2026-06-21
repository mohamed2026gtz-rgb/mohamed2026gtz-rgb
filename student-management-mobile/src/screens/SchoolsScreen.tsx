import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { DataTable, TableText } from '../components/DataTable';
import { ScopeFilterPanel } from '../components/ScopeFilterPanel';
import { buildRegionFilterOptions, buildSchoolLevelPickerOptions } from '../utils/filterOptions';
import { resolveScopeFiltersAsync } from '../utils/scopeDefaults';
import { useAuth } from '../context/AuthContext';
import { getRegions } from '../services/regionService';
import { getSchoolLevels } from '../services/schoolService';
import { loadAccessibleSchools } from '../services/accessibleSchools';
import { Region, School } from '../types';
import { RootTabParamList } from '../navigation/types';
import { colors, radii, shadows } from '../theme/colors';

export function SchoolsScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList, 'Schools'>>();
  const { user } = useAuth();
  const [regions, setRegions] = useState<Region[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scopeLabel, setScopeLabel] = useState<string | null>(null);
  const [lockedFilters, setLockedFilters] = useState<{ region?: boolean; level?: boolean }>({});

  const canQuery = Boolean(selectedRegion && selectedLevel);

  const regionOptions = useMemo(() => {
    const scoped = buildRegionFilterOptions(regions);
    if (lockedFilters.region && selectedRegion) {
      return scoped.filter((o) => o.value === selectedRegion);
    }
    if (lockedFilters.region) return scoped;
    return scoped;
  }, [lockedFilters.region, regions, selectedRegion]);

  const levelOptions = useMemo(() => buildSchoolLevelPickerOptions(levels), [levels]);

  const openSchoolStudents = useCallback(
    (school: School) => {
      navigation.navigate('Students', {
        screen: 'StudentBrowse',
        params: {
          regionId: school.regionId ?? selectedRegionId ?? undefined,
          region: school.region || selectedRegion || undefined,
          level: school.schoolLevel || selectedLevel || undefined,
          schoolId: school.schoolId,
          autoGenerate: true,
        },
      });
    },
    [navigation, selectedLevel, selectedRegion, selectedRegionId]
  );

  const loadFilters = useCallback(async () => {
    setFiltersReady(false);
    try {
      const [regionRows, levelRows] = await Promise.all([getRegions(), getSchoolLevels()]);
      setRegions(regionRows);
      setLevels(levelRows);

      const resolved = await resolveScopeFiltersAsync(user, regionRows);
      setScopeLabel(resolved.scopeLabel);
      setLockedFilters({
        region: resolved.lockRegion,
        level: resolved.lockLevel,
      });
      setSelectedRegionId(resolved.regionId);
      setSelectedRegion(resolved.regionName);
      setSelectedLevel(resolved.level);
    } finally {
      setFiltersReady(true);
    }
  }, [user]);

  const loadSchools = useCallback(
    async (isRefresh = false) => {
      if (!filtersReady || !canQuery) return;
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const rows = await loadAccessibleSchools(user, {
          regionId: selectedRegionId,
          region: selectedRegion,
          level: selectedLevel,
          search: search.trim() || undefined,
        });
        setSchools(rows);
        setHasLoaded(true);
      } catch (e: unknown) {
        setError((e as Error).message || 'Failed to load schools');
        setSchools([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canQuery, filtersReady, search, selectedLevel, selectedRegion, selectedRegionId, user]
  );

  useEffect(() => {
    loadFilters().catch(() => setError('Failed to load filters'));
  }, [loadFilters]);

  useEffect(() => {
    if (!filtersReady) return;
    if (lockedFilters.region && lockedFilters.level && selectedRegion && selectedLevel) {
      loadSchools();
    }
  }, [filtersReady, lockedFilters.level, lockedFilters.region, loadSchools, selectedLevel, selectedRegion]);

  const handleRegionChange = useCallback(
    (value: string | null) => {
      setSelectedRegion(value);
      setHasLoaded(false);
      setSchools([]);
      if (value) {
        const match = regions.find((r) => r.name === value);
        setSelectedRegionId(match ? Number(match.auto) : null);
      } else {
        setSelectedRegionId(null);
      }
      if (!lockedFilters.level) {
        setSelectedLevel(null);
      }
    },
    [lockedFilters.level, regions]
  );

  const handleLevelChange = useCallback((value: string | null) => {
    setSelectedLevel(value);
    setHasLoaded(false);
    setSchools([]);
  }, []);

  const handleViewSchools = useCallback(() => {
    if (!canQuery) {
      setError('Select a region and school level first.');
      return;
    }
    loadSchools();
  }, [canQuery, loadSchools]);

  const columns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 44,
        align: 'center' as const,
        render: (_: School, rowIndex: number) => <TableText center>{rowIndex + 1}</TableText>,
      },
      {
        key: 'schoolNo',
        title: 'School No',
        width: 96,
        render: (item: School) => <TableText>{item.schoolNumber || '-'}</TableText>,
      },
      {
        key: 'name',
        title: 'School Name',
        width: 180,
        render: (item: School) => (
          <Pressable onPress={() => openSchoolStudents(item)}>
            <TableText bold>{item.schoolName || '-'}</TableText>
          </Pressable>
        ),
      },
      {
        key: 'region',
        title: 'Region',
        width: 110,
        render: (item: School) => <TableText muted>{item.region || '-'}</TableText>,
      },
      {
        key: 'level',
        title: 'Level',
        width: 90,
        render: (item: School) => <TableText>{item.schoolLevel || '-'}</TableText>,
      },
      {
        key: 'district',
        title: 'District',
        width: 110,
        render: (item: School) => <TableText muted>{item.district || '-'}</TableText>,
      },
      {
        key: 'count',
        title: 'Students',
        width: 80,
        align: 'center' as const,
        render: (item: School) => (
          <TableText center bold>
            {item.studentCount != null ? item.studentCount : '-'}
          </TableText>
        ),
      },
      {
        key: 'action',
        title: 'Open',
        width: 88,
        render: (item: School) => (
          <Pressable style={styles.openBtn} onPress={() => openSchoolStudents(item)}>
            <Text style={styles.openBtnText}>Students</Text>
          </Pressable>
        ),
      },
    ],
    [openSchoolStudents]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => (hasLoaded ? loadSchools(true) : handleViewSchools())}
            enabled={canQuery}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <ScopeFilterPanel
          title="Find schools"
          showSchool={false}
          regionOptions={regionOptions}
          levelOptions={levelOptions}
          schoolOptions={[]}
          selectedRegion={selectedRegion}
          selectedLevel={selectedLevel}
          selectedSchoolId={null}
          onRegionChange={handleRegionChange}
          onLevelChange={handleLevelChange}
          onSchoolChange={() => {}}
          lockedFilters={lockedFilters}
          levelRequired
          scopeBanner={
            scopeLabel
              ? `${scopeLabel}. Choose region and level, then load schools on demand.`
              : 'Select region and school level, then tap View schools. Schools are not loaded until you ask.'
          }
        />

        <View style={styles.actionBar}>
          <TextInput
            style={[styles.search, !canQuery && styles.searchDisabled]}
            placeholder={canQuery ? 'Search school name or number' : 'Select region and level first'}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={() => (hasLoaded ? loadSchools() : handleViewSchools())}
            returnKeyType="search"
            editable={canQuery}
          />
          <Pressable
            style={[styles.viewBtn, (!canQuery || loading) && styles.viewBtnDisabled]}
            onPress={handleViewSchools}
            disabled={!canQuery || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.viewBtnText}>{hasLoaded ? 'Refresh list' : 'View schools'}</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!hasLoaded && !loading ? (
          <View style={styles.promptCard}>
            <Text style={styles.promptTitle}>Schools load on demand</Text>
            <Text style={styles.promptText}>
              Step 1: Choose your region{'\n'}
              Step 2: Choose school level (Primary, Secondary, etc.){'\n'}
              Step 3: Tap View schools
            </Text>
          </View>
        ) : null}

        {loading && !hasLoaded ? (
          <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
        ) : null}

        {hasLoaded && !loading ? (
          <DataTable
            title="School list"
            subtitle={`${schools.length} school${schools.length === 1 ? '' : 's'} · ${selectedRegion} · ${selectedLevel}`}
            columns={columns}
            data={schools}
            keyExtractor={(item) => String(item.schoolId)}
            emptyMessage="No schools match your filters"
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { paddingBottom: 28 },
  actionBar: {
    marginHorizontal: 12,
    marginBottom: 12,
    gap: 10,
  },
  search: {
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 15,
    color: colors.text,
  },
  searchDisabled: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textMuted,
  },
  viewBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 14,
    alignItems: 'center',
    ...shadows.card,
  },
  viewBtnDisabled: {
    opacity: 0.5,
  },
  viewBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  promptCard: {
    marginHorizontal: 12,
    marginTop: 4,
    padding: 18,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
  },
  promptTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: 8,
  },
  promptText: {
    fontSize: 13,
    lineHeight: 22,
    color: colors.textSecondary,
  },
  openBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  openBtnText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  error: { color: colors.error, textAlign: 'center', marginHorizontal: 12, marginBottom: 8 },
});