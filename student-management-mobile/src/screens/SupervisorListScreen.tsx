import React, { useCallback, useMemo, useState } from 'react';
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
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { DataTable, TableText } from '../components/DataTable';
import { SupervisorPhotoModal } from '../components/SupervisorPhotoModal';
import { deleteSupervisor, getSupervisors } from '../services/supervisorService';
import { sanitizeSearchInput } from '../utils/inputSanitize';
import { Supervisor, SupervisorLevel } from '../types';
import { SupervisorsStackParamList } from '../navigation/types';

type Route = RouteProp<SupervisorsStackParamList, 'SupervisorList'>;

export function SupervisorListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SupervisorsStackParamList>>();
  const { level } = useRoute<Route>().params;
  const [rows, setRows] = useState<Supervisor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [photoTarget, setPhotoTarget] = useState<Supervisor | null>(null);

  const title = level === 'primary' ? 'Primary Supervisors' : 'Secondary Supervisors';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getSupervisors(level, sanitizeSearchInput(search) || undefined));
    } finally {
      setLoading(false);
    }
  }, [level, search]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleDelete = (item: Supervisor) => {
    Alert.alert('Delete supervisor', `Remove ${item.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteSupervisor(level, item.id);
          load();
        },
      },
    ]);
  };

  const columns = useMemo(
    () => [
      {
        key: 'row',
        title: '#',
        width: 40,
        align: 'center' as const,
        render: (_: Supervisor, i: number) => <TableText center>{i + 1}</TableText>,
      },
      {
        key: 'name',
        title: 'Name',
        width: 130,
        render: (item: Supervisor) => <TableText bold>{item.name}</TableText>,
      },
      {
        key: 'region',
        title: 'Region',
        width: 90,
        render: (item: Supervisor) => <TableText muted>{item.region || '—'}</TableText>,
      },
      {
        key: 'sex',
        title: 'Sex',
        width: 50,
        align: 'center' as const,
        render: (item: Supervisor) => <TableText center>{item.sex || '—'}</TableText>,
      },
      {
        key: 'mobile',
        title: 'Mobile',
        width: 100,
        render: (item: Supervisor) => <TableText>{item.mobile || '—'}</TableText>,
      },
      {
        key: 'title',
        title: 'Title',
        width: 100,
        render: (item: Supervisor) => <TableText muted>{item.title || '—'}</TableText>,
      },
      {
        key: 'institution',
        title: 'Institution',
        width: 120,
        render: (item: Supervisor) => (
          <TableText muted>{item.currentInstitution || '—'}</TableText>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        width: 110,
        render: (item: Supervisor) => (
          <View>
            <Pressable
              onPress={() => {
                if (!item.hasPhoto) {
                  Alert.alert('No photo', 'This supervisor has no photo on record.');
                  return;
                }
                setPhotoTarget(item);
              }}
            >
              <Text style={styles.link}>View photo</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('SupervisorForm', { level, id: item.id })}
            >
              <Text style={styles.link}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => handleDelete(item)}>
              <Text style={styles.deleteLink}>Delete</Text>
            </Pressable>
          </View>
        ),
      },
    ],
    [level, navigation]
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search name, email, mobile"
        value={search}
        onChangeText={setSearch}
        onSubmitEditing={load}
        returnKeyType="search"
      />
      <Pressable
        style={styles.addBtn}
        onPress={() => navigation.navigate('SupervisorForm', { level })}
      >
        <Text style={styles.addBtnText}>+ Add supervisor</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <DataTable
            title={title}
            subtitle={`${rows.length} supervisor${rows.length === 1 ? '' : 's'}`}
            columns={columns}
            data={rows}
            keyExtractor={(item) => String(item.id)}
          />
        </ScrollView>
      )}

      <SupervisorPhotoModal
        visible={photoTarget != null}
        level={level}
        supervisor={photoTarget}
        onClose={() => setPhotoTarget(null)}
      />
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
  addBtn: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700' },
  link: { color: colors.primary, fontWeight: '600', fontSize: 12, marginBottom: 4 },
  deleteLink: { color: colors.error, fontWeight: '600', fontSize: 12 },
});
