import React, { useCallback, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getStudents } from '../services/studentService';
import { isAdmin, isScopedStaff, Student } from '../types';
import { StudentsStackParamList } from '../navigation/types';

export function StudentsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<StudentsStackParamList>>();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [searchAllSchools, setSearchAllSchools] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(
    async (pageNum = 1, append = false) => {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const result = await getStudents({
          page: pageNum,
          pageSize: 20,
          search: search.trim() || undefined,
          searchAllSchools: isAdmin(user) && searchAllSchools,
          schoolId: isScopedStaff(user) ? undefined : user?.schoolId,
        });
        setStudents((prev) => (append ? [...prev, ...result.items] : result.items));
        setPage(result.page);
        setTotalPages(result.totalPages);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [search, searchAllSchools, user]
  );

  useFocusEffect(
    useCallback(() => {
      load(1, false);
    }, [load])
  );

  const renderItem = ({ item }: { item: Student }) => (
    <Pressable
      style={styles.card}
      onPress={() => navigation.navigate('StudentDetail', { studentNo: item.studentNo })}
    >
      <Text style={styles.name}>{item.fullName || item.studentNo}</Text>
      <Text style={styles.meta}>ID: {item.studentNo}</Text>
      {item.classId && <Text style={styles.meta}>Class: {item.classId}</Text>}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.browseLink}
        onPress={() => navigation.navigate('StudentBrowse')}
      >
        <Text style={styles.browseLinkText}>← Back to filtered student list</Text>
      </Pressable>
      <TextInput
        style={styles.search}
        placeholder="Search by name or unique ID"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={() => load(1, false)}
        returnKeyType="search"
      />
      {isAdmin(user) && (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Search all schools</Text>
          <Switch value={searchAllSchools} onValueChange={setSearchAllSchools} />
        </View>
      )}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item.studentNo}
          renderItem={renderItem}
          onEndReached={() => {
            if (page < totalPages && !loadingMore) load(page + 1, true);
          }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator style={{ margin: 16 }} /> : null
          }
          ListEmptyComponent={<Text style={styles.empty}>No students found</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  browseLink: {
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    backgroundColor: colors.primarySoft,
    borderRadius: 10,
  },
  browseLinkText: { color: colors.primary, fontWeight: '600', textAlign: 'center' },
  search: {
    margin: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  toggleLabel: { color: '#444' },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 16,
    borderRadius: 10,
    elevation: 1,
  },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { marginTop: 4, color: colors.textSecondary, fontSize: 13 },
  empty: { textAlign: 'center', marginTop: 40, color: colors.textMuted },
});
