import React, { useCallback, useMemo, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { DataTable, TableText } from '../components/DataTable';
import { getAssignments, removeAssignment } from '../services/supervisorService';
import { SupervisorAssignment } from '../types';
import { SupervisorsStackParamList } from '../navigation/types';

type Route = RouteProp<SupervisorsStackParamList, 'SupervisorAssignments'>;
type Nav = NativeStackNavigationProp<SupervisorsStackParamList, 'SupervisorAssignments'>;

export function SupervisorAssignmentsScreen() {
  const navigation = useNavigation<Nav>();
  const { level } = useRoute<Route>().params;
  const [rows, setRows] = useState<SupervisorAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  const title =
    level === 'primary' ? 'Primary Supervisor Assignments' : 'Secondary Supervisor Assignments';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getAssignments(level));
    } finally {
      setLoading(false);
    }
  }, [level]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openCenter = (item: SupervisorAssignment) => {
    navigation.navigate('ExamCenterDetail', {
      level,
      centerId: item.centerId,
      centerName: item.centerName,
    });
  };

  const handleRemove = (item: SupervisorAssignment) => {
    Alert.alert('Remove assignment', `Unassign ${item.supervisorName} from ${item.centerName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          await removeAssignment(level, item.id);
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
        width: 36,
        align: 'center' as const,
        render: (_: SupervisorAssignment, i: number) => (
          <TableText center>{i + 1}</TableText>
        ),
      },
      {
        key: 'supervisor',
        title: 'Supervisor',
        width: 120,
        render: (item: SupervisorAssignment) => (
          <TableText bold>{item.supervisorName || '—'}</TableText>
        ),
      },
      {
        key: 'center',
        title: 'Exam Center',
        width: 120,
        render: (item: SupervisorAssignment) => (
          <Pressable onPress={() => openCenter(item)}>
            <Text style={styles.link}>{item.centerName || '—'}</Text>
          </Pressable>
        ),
      },
      {
        key: 'schools',
        title: 'Schools',
        width: 64,
        align: 'center' as const,
        render: (item: SupervisorAssignment) => (
          <TableText center bold>
            {item.schoolCount != null ? item.schoolCount : '—'}
          </TableText>
        ),
      },
      {
        key: 'students',
        title: 'Students',
        width: 72,
        align: 'center' as const,
        render: (item: SupervisorAssignment) => (
          <TableText center bold>
            {item.studentCount != null ? item.studentCount : '—'}
          </TableText>
        ),
      },
      {
        key: 'region',
        title: 'Region',
        width: 80,
        render: (item: SupervisorAssignment) => (
          <TableText muted>{item.region || '—'}</TableText>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        width: 110,
        render: (item: SupervisorAssignment) => (
          <View style={styles.actions}>
            <Pressable onPress={() => openCenter(item)}>
              <Text style={styles.view}>View</Text>
            </Pressable>
            <Pressable onPress={() => handleRemove(item)}>
              <Text style={styles.remove}>Remove</Text>
            </Pressable>
          </View>
        ),
      },
    ],
    [level]
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          <DataTable
            title={title}
            subtitle={`${rows.length} assignment${rows.length === 1 ? '' : 's'} · tap center or View for schools & students`}
            columns={columns}
            data={rows}
            keyExtractor={(item) => String(item.id)}
          />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  link: { color: colors.primary },
  actions: { gap: 6 },
  view: { color: colors.primary, fontWeight: '600', fontSize: 12 },
  remove: { color: colors.error, fontWeight: '600', fontSize: 12 },
});
