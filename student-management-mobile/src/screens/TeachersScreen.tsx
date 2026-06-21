import React, { useCallback, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getTeachers } from '../services/teacherService';
import { Teacher } from '../types';

export function TeachersScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getTeachers({
        page: 1,
        pageSize: 50,
        search: search.trim() || undefined,
      });
      setTeachers(result.items);
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
      <TextInput
        style={styles.search}
        placeholder="Search head teachers"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        returnKeyType="search"
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={teachers}
          keyExtractor={(item) => `${item.auto}-${item.fullName}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>{item.title || 'Head Teacher'}</Text>
              {item.telephone && <Text style={styles.meta}>{item.telephone}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No teachers found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  search: {
    margin: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 10,
  },
  name: { fontSize: 16, fontWeight: '600' },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
});
