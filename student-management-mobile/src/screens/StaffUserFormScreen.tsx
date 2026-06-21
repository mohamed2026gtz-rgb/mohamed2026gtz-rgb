import React, { useEffect, useMemo, useState } from 'react';
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
import { FilterPickerModal } from '../components/FilterPickerModal';
import {
  buildDistrictIdFilterOptions,
  buildLevelFilterOptions,
  buildRegionIdFilterOptions,
} from '../utils/filterOptions';
import { getDistricts, getRegions } from '../services/regionService';
import { getSchoolLevels, getSchools } from '../services/schoolService';
import {
  createStaffUser,
  getScopeTypeOptions,
  getStaffUser,
  updateStaffUser,
} from '../services/staffUserService';
import { getApiErrorMessage } from '../services/apiClient';
import { getEmailError } from '../utils/validation';
import { District, ScopeTypeOption, UserScopeType } from '../types';
import { StaffUsersStackParamList } from '../navigation/types';

type Route = RouteProp<StaffUsersStackParamList, 'StaffUserForm'>;

function toNumberId(value: string | number | null): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function StaffUserFormScreen() {
  const navigation = useNavigation();
  const { id } = useRoute<Route>().params;
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [scopeOptions, setScopeOptions] = useState<ScopeTypeOption[]>([]);
  const [regions, setRegions] = useState<Awaited<ReturnType<typeof getRegions>>>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [schools, setSchools] = useState<Awaited<ReturnType<typeof getSchools>>>([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [scopeType, setScopeType] = useState<UserScopeType | null>(null);
  const [regionId, setRegionId] = useState<number | null>(null);
  const [districtId, setDistrictId] = useState<number | null>(null);
  const [schoolLevel, setSchoolLevel] = useState<string | null>(null);
  const [schoolIds, setSchoolIds] = useState<number[]>([]);
  const [picker, setPicker] = useState<'scope' | 'region' | 'district' | 'level' | null>(null);

  const emailError = useMemo(() => getEmailError(email, !isEdit), [email, isEdit]);
  const regionOptions = useMemo(() => buildRegionIdFilterOptions(regions), [regions]);
  const districtOptions = useMemo(() => buildDistrictIdFilterOptions(districts), [districts]);
  const levelOptions = useMemo(() => buildLevelFilterOptions(levels), [levels]);

  const selectedRegion = regions.find((r) => r.auto === regionId);
  const selectedDistrict = districts.find((d) => d.auto === districtId);

  const needsRegion =
    scopeType === 'region' ||
    scopeType === 'district' ||
    scopeType === 'school_level' ||
    scopeType === 'school';

  const needsDistrict =
    scopeType === 'district' || scopeType === 'school_level' || scopeType === 'school';

  const needsLevel = scopeType === 'school_level' || scopeType === 'school';

  useEffect(() => {
    (async () => {
      try {
        const [scopeRows, regionRows, levelRows] = await Promise.all([
          getScopeTypeOptions(),
          getRegions(),
          getSchoolLevels(),
        ]);
        setScopeOptions(scopeRows);
        setRegions(regionRows);
        setLevels(levelRows);
      } catch {
        Alert.alert('Error', 'Failed to load form options');
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    (async () => {
      try {
        const user = await getStaffUser(id);
        setName(user.fullName || '');
        setEmail(user.email || '');
        const scope = user.accessScope;
        if (scope?.scopeType) setScopeType(scope.scopeType);
        if (scope?.regionId) setRegionId(scope.regionId);
        if (scope?.districtId) setDistrictId(scope.districtId);
        if (scope?.schoolLevel) setSchoolLevel(scope.schoolLevel);
        if (scope?.schoolIds?.length) setSchoolIds(scope.schoolIds);
      } catch (e: unknown) {
        Alert.alert('Error', getApiErrorMessage(e, 'Failed to load user'));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, navigation]);

  useEffect(() => {
    if (!regionId) {
      setDistricts([]);
      return;
    }
    (async () => {
      try {
        setDistricts(await getDistricts(regionId));
      } catch {
        setDistricts([]);
      }
    })();
  }, [regionId]);

  useEffect(() => {
    if (scopeType !== 'school_level' && scopeType !== 'school') {
      setSchools([]);
      return;
    }
    if (!regionId) {
      setSchools([]);
      return;
    }
    (async () => {
      try {
        const rows = await getSchools({
          regionId,
          region: selectedRegion?.name || undefined,
          level: schoolLevel || undefined,
        });
        let filtered = rows;
        if (districtId && selectedDistrict?.name) {
          filtered = filtered.filter((s) => s.district === selectedDistrict.name);
        }
        if (scopeType === 'school_level' && schoolLevel) {
          filtered = filtered.filter((s) => s.schoolLevel === schoolLevel);
        }
        setSchools(filtered);
      } catch {
        setSchools([]);
      }
    })();
  }, [scopeType, regionId, districtId, schoolLevel, selectedRegion?.name, selectedDistrict?.name, needsLevel]);

  const toggleSchool = (schoolId: number) => {
    setSchoolIds((prev) =>
      prev.includes(schoolId) ? prev.filter((x) => x !== schoolId) : [...prev, schoolId]
    );
  };

  const validateScope = (): string | null => {
    if (!scopeType) return 'Select an access level';
    if (needsRegion && !regionId) return 'Select a region';
    if (scopeType === 'district' && !districtId) return 'Select a district';
    if (scopeType === 'school_level' && !schoolLevel) return 'Select a school level';
    if (scopeType === 'school' && !schoolIds.length) return 'Select at least one school';
    return null;
  };

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Validation', 'Name is required');
    if (emailError) return Alert.alert('Validation', emailError);
    if (!isEdit && password.trim().length < 6) {
      return Alert.alert('Validation', 'Password must be at least 6 characters');
    }
    const scopeError = validateScope();
    if (scopeError) return Alert.alert('Validation', scopeError);

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        email: email.trim(),
        scopeType: scopeType!,
        regionId: regionId || undefined,
        districtId: districtId || undefined,
        schoolLevel: schoolLevel || undefined,
        schoolIds: scopeType === 'school' ? schoolIds : undefined,
        ...(password.trim() ? { password: password.trim() } : {}),
      };

      if (isEdit && id) {
        await updateStaffUser(id, payload);
        Alert.alert('Saved', 'User updated', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      } else {
        await createStaffUser({ ...payload, password: password.trim(), forcePasswordChange: true });
        Alert.alert('Created', 'User created', [{ text: 'OK', onPress: () => navigation.goBack() }]);
      }
    } catch (e: unknown) {
      Alert.alert('Error', getApiErrorMessage(e, 'Could not save user'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const scopeLabel = scopeOptions.find((o) => o.scopeType === scopeType)?.label || 'Select access level';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <Text style={styles.section}>Account</Text>
      <TextInput style={styles.input} placeholder="Full name *" value={name} onChangeText={setName} />
      <TextInput
        style={styles.input}
        placeholder="Email *"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isEdit}
      />
      <TextInput
        style={styles.input}
        placeholder={isEdit ? 'New password (optional)' : 'Initial password * (min 6)'}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <Text style={styles.section}>Role and access</Text>
      <Pressable style={styles.pickerRow} onPress={() => setPicker('scope')}>
        <Text style={styles.pickerLabel}>Access level *</Text>
        <Text style={styles.pickerValue}>{scopeLabel}</Text>
      </Pressable>

      {needsRegion ? (
        <Pressable style={styles.pickerRow} onPress={() => setPicker('region')}>
          <Text style={styles.pickerLabel}>Region *</Text>
          <Text style={[styles.pickerValue, !selectedRegion && styles.pickerPlaceholder]}>
            {selectedRegion?.name || 'Select region'}
          </Text>
        </Pressable>
      ) : null}

      {needsDistrict && regionId ? (
        <Pressable style={styles.pickerRow} onPress={() => setPicker('district')}>
          <Text style={styles.pickerLabel}>District{scopeType === 'district' ? ' *' : ''}</Text>
          <Text style={[styles.pickerValue, !selectedDistrict && styles.pickerPlaceholder]}>
            {selectedDistrict?.name || 'Select district'}
          </Text>
        </Pressable>
      ) : null}

      {needsLevel ? (
        <Pressable style={styles.pickerRow} onPress={() => setPicker('level')}>
          <Text style={styles.pickerLabel}>School level{scopeType === 'school_level' ? ' *' : ''}</Text>
          <Text style={[styles.pickerValue, !schoolLevel && styles.pickerPlaceholder]}>
            {schoolLevel || 'Select level'}
          </Text>
        </Pressable>
      ) : null}

      {scopeType === 'school' ? (
        <View style={styles.schoolBox}>
          <Text style={styles.pickerLabel}>Schools * ({schoolIds.length} selected)</Text>
          {!regionId ? (
            <Text style={styles.hint}>Select a region first to load schools.</Text>
          ) : schools.length === 0 ? (
            <Text style={styles.hint}>No schools found for these filters.</Text>
          ) : (
            schools.map((school) => {
              const active = schoolIds.includes(school.schoolId);
              return (
                <Pressable
                  key={school.schoolId}
                  style={[styles.schoolRow, active && styles.schoolRowActive]}
                  onPress={() => toggleSchool(school.schoolId)}
                >
                  <Text style={styles.schoolName}>{school.schoolName}</Text>
                  <Text style={styles.schoolMeta}>
                    {school.schoolLevel || '-'} · {school.district || '-'}
                  </Text>
                  {active ? <Text style={styles.check}>✓</Text> : null}
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}

      <Pressable style={[styles.saveBtn, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : isEdit ? 'Update user' : 'Create user'}</Text>
      </Pressable>

      <FilterPickerModal
        visible={picker === 'scope'}
        title="Access level"
        options={scopeOptions.map((o) => ({ label: `${o.label} (${o.role})`, value: o.scopeType }))}
        selected={scopeType}
        onSelect={(value) => {
          setScopeType(value as UserScopeType);
          setRegionId(null);
          setDistrictId(null);
          setSchoolLevel(null);
          setSchoolIds([]);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <FilterPickerModal
        visible={picker === 'region'}
        title="Select region"
        options={regionOptions}
        selected={regionId}
        searchable
        searchPlaceholder="Search regions..."
        onSelect={(value) => {
          const nextRegionId = toNumberId(value);
          setRegionId(nextRegionId);
          setDistrictId(null);
          setSchoolIds([]);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <FilterPickerModal
        visible={picker === 'district'}
        title="Select district"
        options={districtOptions}
        selected={districtId}
        searchable
        searchPlaceholder="Search districts..."
        onSelect={(value) => {
          setDistrictId(toNumberId(value));
          setSchoolIds([]);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
      <FilterPickerModal
        visible={picker === 'level'}
        title="School level"
        options={levelOptions.filter((o) => o.value != null)}
        selected={schoolLevel}
        onSelect={(value) => {
          setSchoolLevel(value != null ? String(value) : null);
          setSchoolIds([]);
          setPicker(null);
        }}
        onClose={() => setPicker(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 12 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  section: {
    marginTop: 8,
    marginBottom: 8,
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  pickerRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  pickerLabel: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pickerValue: { marginTop: 4, fontSize: 15, fontWeight: '700', color: colors.primary },
  pickerPlaceholder: { color: '#999', fontWeight: '600' },
  schoolBox: { marginTop: 8, marginBottom: 12 },
  schoolRow: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
  },
  schoolRowActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  schoolName: { fontSize: 14, fontWeight: '700', color: colors.text },
  schoolMeta: { marginTop: 2, fontSize: 11, color: colors.textMuted },
  check: { position: 'absolute', right: 12, top: 12, fontSize: 18, color: colors.primary, fontWeight: '800' },
  hint: { fontSize: 12, color: colors.textMuted, marginTop: 6 },
  saveBtn: {
    backgroundColor: '#2e7d32',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  disabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});