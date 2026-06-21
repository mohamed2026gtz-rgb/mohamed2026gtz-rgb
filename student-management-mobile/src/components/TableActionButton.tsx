import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { colors, radii } from '../theme/colors';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'warning';
  style?: ViewStyle;
  disabled?: boolean;
}

export function TableActionButton({
  label,
  onPress,
  variant = 'primary',
  style,
  disabled,
}: Props) {
  return (
    <Pressable
      style={[
        styles.btn,
        variant === 'secondary' && styles.secondary,
        variant === 'success' && styles.success,
        variant === 'warning' && styles.warning,
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: radii.sm,
    marginBottom: 4,
    minWidth: 64,
    alignItems: 'center',
  },
  secondary: { backgroundColor: colors.textSecondary },
  success: { backgroundColor: colors.success },
  warning: { backgroundColor: '#ef6c00' },
  disabled: { opacity: 0.45 },
  text: { color: colors.white, fontSize: 11, fontWeight: '700' },
});
