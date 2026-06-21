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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { SupervisorAssignmentPanel } from '../components/SupervisorAssignmentPanel';
import { getPrimaryExamCenters, getSecondaryExamCenters } from '../services/examCenterService';
import { getRegions } from '../services/regionService';
import { assignSupervisor, getAssignments, getSupervisors } from '../services/supervisorService';
import {
  buildExamCenterFilterOptions,
  buildRegionFilterOptions,
  buildSupervisorFilterOptions,
} from '../utils/filterOptions';
import { ExamCenter, Region, Supervisor, SupervisorAssignment } from '../types';
import { SupervisorsStackParamList } from '../navigation/types';

type Route = RouteProp<SupervisorsStackParamList, 'AssignSupervisor'>;

export function AssignSupervisorScreen() {
  const navigation = useNavigation();
  const { level } = useRoute<Route>().params;
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [centers, setCenters] = useState<ExamCenter[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [assignments, setAssignments] = useState<SupervisorAssignment[]>([]);
  const [selectedSupervisorId, setSelectedSupervisorId] = useState<number | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedCenterId, setSelectedCenterId] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const yearAssignments = useMemo(
    () => assignments.filter((a) => a.academicYear === academicYear.trim()),
    [assignments, academicYear]
  );

  const assignedSupervisorIds = useMemo(
    () => new Set(yearAssignments.map((a) => a.supervisorId)),
    [yearAssignments]
  );

  const assignedCenterIds = useMemo(
    () => new Set(yearAssignments.map((a) => a.centerId)),
    [yearAssignments]
  );

  const availableSupervisors = useMemo(
    () => supervisors.filter((s) => !assignedSupervisorIds.has(s.id)),
    [supervisors, assignedSupervisorIds]
  );

  const regionCenters = useMemo(() => {
    if (!selectedRegion) return [];
    return centers.filter((c) => c.region === selectedRegion);
  }, [centers, selectedRegion]);

  const availableCenters = useMemo(
    () => regionCenters.filter((c) => !assignedCenterIds.has(c.id)),
    [regionCenters, assignedCenterIds]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const year = academicYear.trim() || '2025/2026';
      const [supRows, centerRows, assignmentRows, regionRows] = await Promise.all([
        getSupervisors(level),
        level === 'primary' ? getPrimaryExamCenters() : getSecondaryExamCenters(),
        getAssignments(level, { academicYear: year }),
        getRegions(),
      ]);
      setSupervisors(supRows);
      setCenters(centerRows);
      setAssignments(assignmentRows);
      setRegions(regionRows);
    } finally {
      setLoading(false);
    }
  }, [level, academicYear]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selectedSupervisorId && assignedSupervisorIds.has(selectedSupervisorId)) {
      setSelectedSupervisorId(null);
    }
    if (selectedCenterId && assignedCenterIds.has(selectedCenterId)) {
      setSelectedCenterId(null);
    }
  }, [assignedSupervisorIds, assignedCenterIds, selectedSupervisorId, selectedCenterId]);

  useEffect(() => {
    if (!selectedCenterId) return;
    const match = centers.find((c) => c.id === selectedCenterId);
    if (!selectedRegion || !match || match.region !== selectedRegion) {
      setSelectedCenterId(null);
    }
  }, [centers, selectedCenterId, selectedRegion]);

  const handleRegionChange = (value: string | null) => {
    setSelectedRegion(value);
    setSelectedCenterId(null);
  };

  const supervisorOptions = useMemo(
    () => buildSupervisorFilterOptions(availableSupervisors),
    [availableSupervisors]
  );

  const regionOptions = useMemo(() => buildRegionFilterOptions(regions), [regions]);

  const centerOptions = useMemo(
    () => buildExamCenterFilterOptions(availableCenters),
    [availableCenters]
  );

  const save = async () => {
    if (!selectedSupervisorId || !selectedCenterId) {
      Alert.alert('Validation', 'Select an available supervisor and an available exam center');
      return;
    }
    setSaving(true);
    try {
      await assignSupervisor(level, {
        supervisorId: selectedSupervisorId,
        centerId: selectedCenterId,
        academicYear: academicYear.trim() || '2025/2026',
        notes: notes.trim() || undefined,
      });
      Alert.alert(
        'Success',
        'Supervisor assigned to exam center.\nOne supervisor ↔ one exam center for this year.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (e as Error).message ||
        'Assignment failed';
      Alert.alert('Error', String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !supervisors.length) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const levelLabel = level === 'primary' ? 'Primary' : 'Secondary';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Assign {levelLabel} Supervisor</Text>
      <Text style={styles.ruleNote}>
        One-to-one rule: each supervisor can have only one exam center, and each exam center can
        have only one supervisor (per academic year).
      </Text>

      <Text style={styles.label}>Academic year</Text>
      <TextInput style={styles.input} value={academicYear} onChangeText={setAcademicYear} />

      <SupervisorAssignmentPanel
        title="Select assignment"
        levelLabel={levelLabel}
        supervisorOptions={supervisorOptions}
        regionOptions={regionOptions}
        centerOptions={centerOptions}
        selectedSupervisorId={selectedSupervisorId}
        selectedRegion={selectedRegion}
        selectedCenterId={selectedCenterId}
        onSupervisorChange={setSelectedSupervisorId}
        onRegionChange={handleRegionChange}
        onCenterChange={setSelectedCenterId}
        loading={loading}
      />

      {availableSupervisors.length === 0 ? (
        <Text style={styles.warn}>All supervisors are already assigned for {academicYear}.</Text>
      ) : null}
      {selectedRegion && availableCenters.length === 0 ? (
        <Text style={styles.warn}>
          No unassigned exam centers in {selectedRegion} for {academicYear}.
        </Text>
      ) : null}

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Assigning...' : 'Assign supervisor'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
    margin: 16,
    marginBottom: 8,
  },
  ruleNote: {
    marginHorizontal: 16,
    marginBottom: 12,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
    backgroundColor: colors.primarySoft,
    padding: 10,
    borderRadius: 8,
  },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginHorizontal: 12, marginBottom: 6 },
  input: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  warn: {
    marginHorizontal: 12,
    marginBottom: 12,
    fontSize: 12,
    color: colors.error,
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: colors.primary,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: colors.white, fontWeight: '700' },
});
