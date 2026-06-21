import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radii, shadows } from '../theme/colors';

interface Props {
  title: string;
  value: string;
  color: string;
}

export function StatCard({ title, value, color }: Props) {
  return (
    <View style={[styles.card, { borderLeftColor: color }]}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    padding: 16,
    margin: 6,
    borderLeftWidth: 4,
    ...shadows.card,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  title: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
});
