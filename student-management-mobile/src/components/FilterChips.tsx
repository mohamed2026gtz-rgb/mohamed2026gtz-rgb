import React from 'react';
import { colors } from '../theme/colors';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

export interface FilterOption {
  label: string;
  value: string | number | null;
  subtitle?: string;
}

interface Props {
  label: string;
  options: FilterOption[];
  selected: string | number | null;
  onSelect: (value: string | number | null) => void;
}

export function FilterChips({ label, options, selected, onSelect }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {options.map((opt) => {
          const active =
            selected === opt.value ||
            (selected == null && opt.value == null);
          return (
            <Pressable
              key={`${opt.label}-${String(opt.value)}`}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelect(opt.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginHorizontal: 12, marginBottom: 6 },
  row: { paddingHorizontal: 12, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#d0d7e2',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: '#333' },
  chipTextActive: { color: colors.white, fontWeight: '600' },
});
