import React from 'react';
import { colors } from '../theme/colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SupervisorsStackParamList } from '../navigation/types';

export function SupervisorsHomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<SupervisorsStackParamList>>();

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Exam Supervisors</Text>
      <Text style={styles.sub}>One supervisor per exam center (and one center per supervisor) per academic year.</Text>

      <Section
        title="Primary Supervisors"
        subtitle="191 primary exam centers"
        onList={() => navigation.navigate('SupervisorList', { level: 'primary' })}
        onAssign={() => navigation.navigate('AssignSupervisor', { level: 'primary' })}
        onAssignments={() => navigation.navigate('SupervisorAssignments', { level: 'primary' })}
      />

      <Section
        title="Secondary Supervisors"
        subtitle="668 secondary exam centers"
        onList={() => navigation.navigate('SupervisorList', { level: 'secondary' })}
        onAssign={() => navigation.navigate('AssignSupervisor', { level: 'secondary' })}
        onAssignments={() => navigation.navigate('SupervisorAssignments', { level: 'secondary' })}
      />
    </View>
  );
}

function Section({
  title,
  subtitle,
  onList,
  onAssign,
  onAssignments,
}: {
  title: string;
  subtitle: string;
  onList: () => void;
  onAssign: () => void;
  onAssignments: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardSub}>{subtitle}</Text>
      <Pressable style={styles.btn} onPress={onList}>
        <Text style={styles.btnText}>Supervisor list</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnOutline]} onPress={onAssign}>
        <Text style={[styles.btnText, styles.btnOutlineText]}>Assign to center</Text>
      </Pressable>
      <Pressable style={[styles.btn, styles.btnSecondary]} onPress={onAssignments}>
        <Text style={styles.btnText}>View assignments</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 16 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.primary, marginBottom: 6 },
  sub: { fontSize: 14, color: colors.textSecondary, marginBottom: 20, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  btnSecondary: { backgroundColor: '#3949ab' },
  btnOutline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary },
  btnText: { color: colors.white, fontWeight: '600' },
  btnOutlineText: { color: colors.primary },
});
