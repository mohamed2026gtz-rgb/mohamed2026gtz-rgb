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
import { SexSelector } from '../components/SexSelector';
import { FilterPickerModal } from '../components/FilterPickerModal';
import { SupervisorPhotoCapture } from '../components/SupervisorPhotoCapture';
import { getRegions } from '../services/regionService';
import {
  createSupervisor,
  getSupervisor,
  updateSupervisor,
  uploadSupervisorPhoto,
} from '../services/supervisorService';
import { getEmailError, getMobileError, normalizeMobile } from '../utils/validation';
import { SupervisorsStackParamList } from '../navigation/types';
import { Region } from '../types';

type Route = RouteProp<SupervisorsStackParamList, 'SupervisorForm'>;

type FormKey =
  | 'name'
  | 'mobile'
  | 'yearOfBirth'
  | 'residency'
  | 'email'
  | 'currentInstitution'
  | 'title'
  | 'experienceForSupervision';

const TEXT_FIELDS: Array<{ key: FormKey; label: string; multiline?: boolean; keyboard?: 'email-address' | 'phone-pad' | 'default' }> = [
  { key: 'name', label: 'Name *' },
  { key: 'mobile', label: 'Telephone', keyboard: 'phone-pad' },
  { key: 'yearOfBirth', label: 'Year of birth (YYYY-MM-DD)' },
  { key: 'residency', label: 'Residency' },
  { key: 'email', label: 'Email *', keyboard: 'email-address' },
  { key: 'currentInstitution', label: 'Current institution' },
  { key: 'title', label: 'Title' },
  { key: 'experienceForSupervision', label: 'Experience for supervision', multiline: true },
];

export function SupervisorFormScreen() {
  const navigation = useNavigation();
  const { level, id } = useRoute<Route>().params;
  const isEdit = id != null;
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [initialPassword, setInitialPassword] = useState('');
  const [sex, setSex] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [regions, setRegions] = useState<Region[]>([]);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [form, setForm] = useState<Record<FormKey, string>>({
    name: '',
    mobile: '',
    yearOfBirth: '',
    residency: '',
    email: '',
    currentInstitution: '',
    title: '',
    experienceForSupervision: '',
  });

  const emailError = useMemo(
    () => getEmailError(form.email, !isEdit || Boolean(initialPassword.trim())),
    [form.email, initialPassword, isEdit]
  );
  const mobileError = useMemo(() => getMobileError(form.mobile), [form.mobile]);

  useEffect(() => {
    getRegions()
      .then(setRegions)
      .catch(() => setRegions([]));
  }, []);

  useEffect(() => {
    if (!isEdit || id == null) return;
    (async () => {
      try {
        const s = await getSupervisor(level, id);
        setForm({
          name: s.name || '',
          mobile: s.mobile || '',
          yearOfBirth: s.yearOfBirth || '',
          residency: s.residency || '',
          email: s.email || '',
          currentInstitution: s.currentInstitution || '',
          title: s.title || '',
          experienceForSupervision: s.experienceForSupervision || '',
        });
        setSex(s.sex || '');
        setRegion(s.region || null);
      } catch {
        Alert.alert('Error', 'Could not load supervisor');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, level, navigation]);

  const save = async () => {
    if (!form.name.trim()) {
      Alert.alert('Validation', 'Name is required');
      return;
    }
    if (emailError) {
      Alert.alert('Validation', emailError);
      return;
    }
    if (mobileError) {
      Alert.alert('Validation', mobileError);
      return;
    }
    if (!isEdit && !form.email.trim()) {
      Alert.alert('Validation', 'Email is required for supervisor login');
      return;
    }
    if (!isEdit && initialPassword.trim().length < 6) {
      Alert.alert('Validation', 'Initial password must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        sex: sex || undefined,
        mobile: form.mobile.trim() ? normalizeMobile(form.mobile) : undefined,
        yearOfBirth: form.yearOfBirth.trim() || undefined,
        residency: form.residency.trim() || undefined,
        region: region?.trim() || undefined,
        email: form.email.trim() || undefined,
        currentInstitution: form.currentInstitution.trim() || undefined,
        title: form.title.trim() || undefined,
        experienceForSupervision: form.experienceForSupervision.trim() || undefined,
        initialPassword: !isEdit && initialPassword.trim() ? initialPassword.trim() : undefined,
      };

      let supervisorId = id;
      if (isEdit && id != null) {
        await updateSupervisor(level, id, body);
      } else {
        const created = await createSupervisor(level, body);
        supervisorId = created.id;
        if (created.loginAccountCreated) {
          Alert.alert(
            'Supervisor saved',
            'Login account created. Share email and initial password — they must change it on first login.'
          );
        }
      }

      if (photoUri && supervisorId != null) {
        await uploadSupervisorPhoto(level, supervisorId, photoUri);
      }

      navigation.goBack();
    } catch (e: unknown) {
      Alert.alert('Error', (e as Error).message || 'Save failed');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>
        {isEdit ? 'Edit' : 'Add'} {level === 'primary' ? 'Primary' : 'Secondary'} Supervisor
      </Text>

      <SupervisorPhotoCapture photoUri={photoUri} onPhotoChange={setPhotoUri} />

      <View style={styles.field}>
        <Text style={styles.label}>Region</Text>
        <Pressable style={styles.input} onPress={() => setRegionPickerOpen(true)}>
          <Text style={region ? styles.inputText : styles.inputPlaceholder}>
            {region || 'Select supervisor region'}
          </Text>
        </Pressable>
      </View>

      {TEXT_FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TextInput
            style={[styles.input, f.multiline && styles.multiline, (f.key === 'email' && emailError) || (f.key === 'mobile' && mobileError) ? styles.inputError : null]}
            value={form[f.key]}
            onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
            multiline={Boolean(f.multiline)}
            keyboardType={f.keyboard || 'default'}
            autoCapitalize={f.key === 'email' ? 'none' : 'sentences'}
            autoCorrect={false}
          />
          {f.key === 'email' && emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          {f.key === 'mobile' && mobileError ? <Text style={styles.errorText}>{mobileError}</Text> : null}
        </View>
      ))}

      <SexSelector value={sex} onChange={setSex} />

      {!isEdit ? (
        <View style={styles.field}>
          <Text style={styles.label}>Initial login password *</Text>
          <Text style={styles.hint}>
            Supervisor signs in with email + this password, then must change it on first login.
          </Text>
          <TextInput
            style={styles.input}
            value={initialPassword}
            onChangeText={setInitialPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Min 6 characters"
          />
        </View>
      ) : null}

      <Pressable style={styles.saveBtn} onPress={save} disabled={saving}>
        <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save supervisor'}</Text>
      </Pressable>

      <FilterPickerModal
        visible={regionPickerOpen}
        title="Select region"
        subtitle="Region the supervisor comes from"
        options={regions.map((r) => ({
          label: r.name || `Region ${r.auto}`,
          value: r.name || '',
        }))}
        selected={region}
        onSelect={(value) => setRegion(typeof value === 'string' ? value : null)}
        onClose={() => setRegionPickerOpen(false)}
        searchable
        searchPlaceholder="Search regions..."
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16, paddingBottom: 32 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: { fontSize: 18, fontWeight: '700', color: colors.primary, marginBottom: 16 },
  field: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 4 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  inputText: { fontSize: 15, color: colors.text },
  inputPlaceholder: { fontSize: 15, color: colors.textMuted },
  inputError: { borderColor: '#c62828' },
  errorText: { marginTop: 4, fontSize: 12, color: colors.error },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 6, lineHeight: 16 },
  saveBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});
