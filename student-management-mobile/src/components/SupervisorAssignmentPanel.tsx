import React, { useMemo, useState } from 'react';
import { colors } from '../theme/colors';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { FilterOption } from './FilterChips';
import { FilterPickerModal } from './FilterPickerModal';

type PickerKey = 'supervisor' | 'region' | 'center';

interface Props {
  supervisorOptions: FilterOption[];
  regionOptions: FilterOption[];
  centerOptions: FilterOption[];
  selectedSupervisorId: number | null;
  selectedRegion: string | null;
  selectedCenterId: number | null;
  onSupervisorChange: (value: number | null) => void;
  onRegionChange: (value: string | null) => void;
  onCenterChange: (value: number | null) => void;
  loading?: boolean;
  title?: string;
  levelLabel: string;
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

export function SupervisorAssignmentPanel({
  supervisorOptions,
  regionOptions,
  centerOptions,
  selectedSupervisorId,
  selectedRegion,
  selectedCenterId,
  onSupervisorChange,
  onRegionChange,
  onCenterChange,
  loading = false,
  title = 'Assignment selection',
  levelLabel,
}: Props) {
  const [openPicker, setOpenPicker] = useState<PickerKey | null>(null);

  const supervisorLabel = findLabel(supervisorOptions, selectedSupervisorId);
  const regionLabel = findLabel(regionOptions, selectedRegion);
  const centerLabel = findLabel(centerOptions, selectedCenterId);

  const supervisorHint = useMemo(() => {
    if (loading) return 'Loading supervisors...';
    const count = supervisorOptions.length;
    if (!count) return 'No unassigned supervisors for this year';
    return `${count} supervisor${count === 1 ? '' : 's'} available`;
  }, [loading, supervisorOptions.length]);

  const regionHint = useMemo(() => {
    if (loading) return 'Loading regions...';
    const count = regionOptions.length;
    if (!count) return 'No regions available';
    return `${count} region${count === 1 ? '' : 's'}`;
  }, [loading, regionOptions.length]);

  const centerHint = useMemo(() => {
    if (loading) return 'Loading exam centers...';
    if (!selectedRegion) return 'Select a region first';
    const count = centerOptions.length;
    if (!count) return `No unassigned centers in ${selectedRegion}`;
    return `${count} center${count === 1 ? '' : 's'} in ${selectedRegion}`;
  }, [centerOptions.length, loading, selectedRegion]);

  const summaryParts = [
    selectedSupervisorId ? supervisorLabel : null,
    selectedRegion ? regionLabel : null,
    selectedCenterId ? centerLabel : null,
  ].filter(Boolean);

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>{title}</Text>
        <Text style={styles.panelSubtitle}>{levelLabel} · Supervisor → Exam center</Text>
      </View>

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

      <FilterRow
        step={1}
        title="Supervisor"
        value={supervisorLabel}
        placeholder="Choose supervisor"
        hint={supervisorHint}
        disabled={loading || supervisorOptions.length === 0}
        loading={loading}
        onPress={() => setOpenPicker('supervisor')}
      />

      <FilterRow
        step={2}
        title="Region"
        value={regionLabel}
        placeholder="Choose region"
        hint={regionHint}
        disabled={loading || regionOptions.length === 0}
        loading={loading}
        onPress={() => setOpenPicker('region')}
      />

      <FilterRow
        step={3}
        title="Exam center"
        value={centerLabel}
        placeholder="Choose exam center"
        hint={centerHint}
        disabled={loading || !selectedRegion || centerOptions.length === 0}
        loading={loading}
        onPress={() => setOpenPicker('center')}
      />

      <FilterPickerModal
        visible={openPicker === 'supervisor'}
        title="Select supervisor"
        subtitle="Unassigned supervisors for this academic year"
        options={supervisorOptions}
        selected={selectedSupervisorId}
        onSelect={(v) => onSupervisorChange(typeof v === 'number' ? v : null)}
        onClose={() => setOpenPicker(null)}
        searchable
        searchPlaceholder="Search by name, title, or institution..."
      />

      <FilterPickerModal
        visible={openPicker === 'region'}
        title="Select region"
        subtitle="Filter exam centers by region"
        options={regionOptions}
        selected={selectedRegion}
        onSelect={(v) => onRegionChange(typeof v === 'string' ? v : null)}
        onClose={() => setOpenPicker(null)}
        searchable
        searchPlaceholder="Search regions..."
      />

      <FilterPickerModal
        visible={openPicker === 'center'}
        title="Select exam center"
        subtitle={
          selectedRegion
            ? `Unassigned centers in ${selectedRegion}`
            : 'Select a region first'
        }
        options={centerOptions}
        selected={selectedCenterId}
        onSelect={(v) => onCenterChange(typeof v === 'number' ? v : null)}
        onClose={() => setOpenPicker(null)}
        searchable
        searchPlaceholder="Search center name, region, or district..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginHorizontal: 12,
    marginBottom: 14,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  panelHeader: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  panelTitle: { color: colors.white, fontSize: 16, fontWeight: '700' },
  panelSubtitle: { color: '#c5cae9', fontSize: 12, marginTop: 4, fontWeight: '500' },
  summaryBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8ecf4',
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
    borderBottomColor: '#f0f2f7',
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
  rowPlaceholder: { color: '#aaa', fontWeight: '500' },
  rowHint: { marginTop: 4, fontSize: 11, color: colors.textMuted },
  chevron: { fontSize: 22, color: '#9fa8da', fontWeight: '300', marginLeft: 8 },
});
