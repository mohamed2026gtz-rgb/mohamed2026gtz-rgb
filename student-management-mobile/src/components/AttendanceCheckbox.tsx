import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';

interface Props {
  checked: boolean;
  onToggle: () => void;
  label?: string;
  disabled?: boolean;
}

export function AttendanceCheckbox({ checked, onToggle, label, disabled }: Props) {
  return (
    <Pressable
      style={[styles.row, disabled && styles.disabled]}
      onPress={onToggle}
      disabled={disabled}
      hitSlop={6}
    >
      <View style={[styles.box, checked && styles.boxChecked]}>
        {checked ? <Text style={styles.tick}>✓</Text> : null}
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxChecked: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  tick: { color: colors.white, fontSize: 14, fontWeight: '700', lineHeight: 16 },
  label: { marginLeft: 8, fontSize: 13, color: colors.text, fontWeight: '600' },
});
