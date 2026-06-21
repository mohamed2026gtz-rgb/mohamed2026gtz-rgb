import React from 'react';
import { colors } from '../theme/colors';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SEX_OPTIONS } from '../utils/validation';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function SexSelector({ value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Sex</Text>
      <View style={styles.row}>
        {SEX_OPTIONS.map((option) => {
          const active = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onChange(option)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  row: { flexDirection: 'row', gap: 10 },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d0d7e2',
    backgroundColor: colors.surface,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontWeight: '600', color: '#333' },
  chipTextActive: { color: colors.white },
});
