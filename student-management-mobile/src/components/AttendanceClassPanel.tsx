import React from 'react';
import { colors } from '../theme/colors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AttendanceClassGroup, attendanceStudentsPerClass } from '../utils/attendanceClassGroups';

interface Props {
  schoolLevel?: string | null;
  schoolName?: string | null;
  groups: AttendanceClassGroup[];
  selectedClassNumber: number | null;
  onSelectClass: (classNumber: number) => void;
  totalStudents: number;
}

export function AttendanceClassPanel({
  schoolLevel,
  schoolName,
  groups,
  selectedClassNumber,
  onSelectClass,
  totalStudents,
}: Props) {
  if (!groups.length) return null;

  const perClass = attendanceStudentsPerClass(schoolLevel);
  const levelLabel = perClass === 30 ? 'Primary / ABE' : 'Secondary';

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Select class</Text>
        <Text style={styles.meta}>
          {levelLabel} · {perClass} students per class
          {schoolName ? ` · ${schoolName}` : ''}
        </Text>
        <Text style={styles.meta}>
          {totalStudents} student{totalStudents === 1 ? '' : 's'} → {groups.length} class
          {groups.length === 1 ? '' : 'es'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.radioRow}
      >
        {groups.map((group) => {
          const active = selectedClassNumber === group.classNumber;
          return (
            <Pressable
              key={group.classNumber}
              style={[styles.radioCard, active && styles.radioCardActive]}
              onPress={() => onSelectClass(group.classNumber)}
            >
              <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                {active ? <View style={styles.radioInner} /> : null}
              </View>
              <View style={styles.radioBody}>
                <Text style={[styles.radioLabel, active && styles.radioLabelActive]}>
                  {group.label}
                </Text>
                <Text style={styles.radioCount}>
                  {group.students.length} student{group.students.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.radioRange}>
                  #{group.startIndex}–#{group.endIndex}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  header: { paddingHorizontal: 14, marginBottom: 10 },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  meta: { marginTop: 4, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
  radioRow: { paddingHorizontal: 10, gap: 8 },
  radioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 132,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dde3ee',
    backgroundColor: '#f8faff',
  },
  radioCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#9fa8da',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  radioBody: { flex: 1 },
  radioLabel: { fontSize: 14, fontWeight: '700', color: '#333' },
  radioLabelActive: { color: colors.primary },
  radioCount: { marginTop: 2, fontSize: 11, color: colors.textSecondary },
  radioRange: { marginTop: 1, fontSize: 10, color: colors.textMuted },
});
