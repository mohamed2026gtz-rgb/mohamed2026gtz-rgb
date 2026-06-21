import React, { useCallback, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { listStaffUsers } from '../services/staffUserService';
import { StaffUser } from '../types';
import { StaffUsersStackParamList } from '../navigation/types';

function scopeSummary(user: StaffUser): string {
  const scope = user.accessScope;
  if (!scope?.scopeType) return 'No scope assigned';
  if (scope.scopeType === 'region') return `Region #${scope.regionId}`;
  if (scope.scopeType === 'district') return `District #${scope.districtId}`;
  if (scope.scopeType === 'school_level') {
    return `${scope.schoolLevel || 'Level'} in region ${scope.regionId || '-'}`;
  }
  const count = scope.schoolIds?.length || scope.schoolCount || 0;
  return `${count} school${count === 1 ? '' : 's'}`;
}

export function StaffUsersHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StaffUsersStackParamList>>();
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listStaffUsers({ search: search.trim() || undefined, pageSize: 100 });
      setUsers(result.items);
    } catch {
      setError('Could not load staff users');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Create users with region, district, school level, or specific school access.
      </Text>
      <TextInput
        style={styles.search}
        placeholder="Search by name or email"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        returnKeyType="search"
      />
      <Pressable style={styles.addBtn} onPress={() => navigation.navigate('StaffUserForm', {})}>
        <Text style={styles.addBtnText}>+ Add staff user</Text>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.empty}>No staff users found</Text>}
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate('StaffUserForm', { id: item.id })}
            >
              <Text style={styles.name}>{item.fullName || item.email}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.role}>{item.roles?.[0] || 'Staff'}</Text>
              <Text style={styles.scope}>{scopeSummary(item)}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 12 },
  intro: { fontSize: 13, color: '#555', lineHeight: 18, marginBottom: 10 },
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtnText: { color: colors.white, fontWeight: '700' },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  name: { fontSize: 16, fontWeight: '800', color: colors.primary },
  email: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
  role: { marginTop: 6, fontSize: 12, fontWeight: '700', color: colors.primary },
  scope: { marginTop: 4, fontSize: 12, color: '#444' },
  error: { color: colors.error, textAlign: 'center', marginBottom: 8 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 24 },
});