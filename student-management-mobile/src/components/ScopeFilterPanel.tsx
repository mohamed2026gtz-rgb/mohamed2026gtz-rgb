import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FilterOption } from './FilterChips';
import { FilterPickerModal } from './FilterPickerModal';
import { colors, radii, shadows } from '../theme/colors';

type PickerKey = 'region' | 'level' | 'school';

interface Props {
  regionOptions: FilterOption[];
  levelOptions: FilterOption[];
  schoolOptions: FilterOption[];
  selectedRegion: string | null;
  selectedLevel: string | null;
  selectedSchoolId: number | null;
  onRegionChange: (value: string | null) => void;
  onLevelChange: (value: string | null) => void;
  onSchoolChange: (value: number | null) => void;
  showSchool?: boolean;
  showRegion?: boolean;
  showLevel?: boolean;
  loadingSchools?: boolean;
  title?: string;
  lockedFilters?: { region?: boolean; level?: boolean; school?: boolean };
  scopeBanner?: string | null;
  /** When true (school-scoped users), school list does not require region selection first. */
  schoolScopeMode?: boolean;
  /** When true, level is required (no "All levels" option). */
  levelRequired?: boolean;
}

function findLabel(options: FilterOption[], value: string | number | null): string {
  const match = options.find((o) => o.value === value);
  if (match) return match.label;
  if (value == null) return '';
  return String(value);
}

function FilterRow({
  step,
  title,
  value,
  placeholder,
  hint,
  disabled,
  loading,
  onPress,
}: {
  step: number;
  title: string;
  value: string;
  placeholder: string;
  hint?: string;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
}) {
  const hasValue = Boolean(value);
  return (
    <Pressable
      style={[styles.row, disabled && styles.rowDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.stepBadge}>
        <Text style={styles.stepText}>{step}</Text>
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ alignSelf: 'flex-start' }} />
        ) : (
          <Text style={[styles.rowValue, !hasValue && styles.rowPlaceholder]} numberOfLines={2}>
            {hasValue ? value : placeholder}
          </Text>
        )}
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

export function ScopeFilterPanel({
  regionOptions,
  levelOptions,
  schoolOptions,
  selectedRegion,
  selectedLevel,
  selectedSchoolId,
  onRegionChange,
  onLevelChange,
  onSchoolChange,
  showSchool = true,
  showRegion = true,
  showLevel = true,
  loadingSchools = false,
  title = 'Filter by scope',
  lockedFilters,
  scopeBanner,
  schoolScopeMode = false,
  levelRequired = false,
}: Props) {
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  let step = 1;
  const regionStep = showRegion ? step++ : 0;
  const levelStep = showLevel ? step++ : 0;
  const schoolStep = showSchool ? step++ : 0;

  const regionLabel = findLabel(regionOptions, selectedRegion);
  const levelLabel = findLabel(levelOptions, selectedLevel);
  const schoolLabel = findLabel(schoolOptions, selectedSchoolId);

  const schoolCountHint = useMemo(() => {
    const count = schoolOptions.filter((o) => o.value != null).length;
    if (!schoolScopeMode && showRegion && !selectedRegion) return 'Select a region first';
    if (loadingSchools) return 'Loading schools...';
    if (schoolScopeMode && count) return `${count} assigned school${count === 1 ? '' : 's'}`;
    if (!showRegion && count) return `${count} school${count === 1 ? '' : 's'} in your center`;
    return count ? `${count} school${count === 1 ? '' : 's'} available` : 'No schools in this scope';
  }, [loadingSchools, schoolOptions, schoolScopeMode, selectedRegion, showRegion]);

  const summaryParts = [
    showRegion && selectedRegion ? regionLabel : null,
    showLevel && selectedLevel ? levelLabel : null,
    showSchool && selectedSchoolId
      ? schoolLabel
      : showSchool && (selectedRegion || !showRegion) && !selectedSchoolId
        ? 'All schools'
        : null,
  ].filter(Boolean);

  const subtitleText = showRegion && showLevel && showSchool
    ? 'Region → School level → School'
    : showRegion && showLevel
      ? 'Region → School level'
      : showSchool
        ? 'School in your exam center'
        : 'Filters';

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.panelSubtitle}>{subtitleText}</Text>
      </View>

      {scopeBanner ? (
        <View style={styles.scopeBanner}>
          <Text style={styles.scopeBannerText}>{scopeBanner}</Text>
        </View>
      ) : null}

      {summaryParts.length > 0 ? (
        <View style={styles.summaryBar}>
          {summaryParts.map((part, i) => (
            <View key={`${part}-${i}`} style={styles.summaryPill}>
              <Text style={styles.summaryText} numberOfLines={1}>
                {part}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {showRegion ? (
        <FilterRow
          step={regionStep}
          title="Region"
          value={regionLabel}
          placeholder="Choose region"
          hint={lockedFilters?.region ? 'Set by your access scope' : undefined}
          disabled={lockedFilters?.region}
          onPress={() => setOpenPicker('region')}
        />
      ) : null}

      {showLevel ? (
        <FilterRow
          step={levelStep}
          title="School level"
          value={levelLabel}
          placeholder={levelRequired ? 'Choose school level' : 'All levels'}
          hint={
            lockedFilters?.level
              ? 'Set by your access scope'
              : !selectedRegion && showRegion
                ? 'Select region first'
                : levelRequired
                  ? 'Required — choose Primary, Secondary, etc.'
                  : 'Optional — narrow by Primary, Secondary, etc.'
          }
          disabled={lockedFilters?.level || (showRegion && !selectedRegion)}
          onPress={() => setOpenPicker('level')}
        />
      ) : null}

      {showSchool ? (
        <FilterRow
          step={schoolStep}
          title="School"
          value={schoolLabel}
          placeholder={showRegion ? 'All schools in region' : 'Choose school'}
          hint={schoolScopeMode ? 'Pick one of your assigned schools' : lockedFilters?.school ? 'Set by your access scope' : schoolCountHint}
          disabled={(!schoolScopeMode && showRegion && !selectedRegion) || lockedFilters?.school || loadingSchools}
          loading={loadingSchools}
          onPress={() => setOpenPicker('school')}
        />
      ) : null}

      {showRegion ? (
        <FilterPickerModal
          visible={openPicker === 'region'}
          title="Select region"
          subtitle="Choose the administrative region"
          options={regionOptions.filter((o) => o.value != null)}
          selected={selectedRegion}
          onSelect={(v) => onRegionChange(typeof v === 'string' ? v : null)}
          onClose={() => setOpenPicker(null)}
          searchable
          searchPlaceholder="Search regions..."
        />
      ) : null}

      {showLevel ? (
        <FilterPickerModal
          visible={openPicker === 'level'}
          title="School level"
          subtitle={selectedRegion ? `Levels in ${selectedRegion}` : undefined}
          options={levelOptions}
          selected={selectedLevel}
          onSelect={(v) => onLevelChange(typeof v === 'string' ? v : null)}
          onClose={() => setOpenPicker(null)}
        />
      ) : null}

      {showSchool ? (
        <FilterPickerModal
          visible={openPicker === 'school'}
          title="Select school"
          subtitle={selectedRegion ? `Schools in ${selectedRegion}` : undefined}
          options={schoolOptions}
          selected={selectedSchoolId}
          onSelect={(v) => onSchoolChange(typeof v === 'number' ? v : null)}
          onClose={() => setOpenPicker(null)}
          searchable
          searchPlaceholder="Search school name or number..."
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 12,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  panelHeader: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  panelSubtitle: { color: colors.primaryMuted, fontSize: 12, marginTop: 4, fontWeight: '500' },
  scopeBanner: {
    backgroundColor: colors.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  scopeBannerText: { fontSize: 12, fontWeight: '600', color: colors.warningText, lineHeight: 18 },
  summaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.primarySoft,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryPill: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    maxWidth: '100%',
  },
  summaryText: { fontSize: 12, fontWeight: '600', color: colors.primary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowDisabled: { opacity: 0.55 },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepText: { fontSize: 13, fontWeight: '800', color: colors.primary },
  rowContent: { flex: 1 },
  rowTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  rowValue: { fontSize: 15, fontWeight: '700', color: colors.text, lineHeight: 20 },
  rowPlaceholder: { color: colors.textMuted, fontWeight: '500' },
  rowHint: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  chevron: { fontSize: 22, color: colors.primaryMuted, fontWeight: '300', marginLeft: 8 },
});
