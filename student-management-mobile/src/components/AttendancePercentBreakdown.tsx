import React from 'react';
import { colors } from '../theme/colors';
import { StyleSheet, Text, View } from 'react-native';

interface PercentRow {
  key: string;
  label: string;
  subtitle?: string;
  percent: number;
  valueLabel?: string;
}

interface Props {
  title: string;
  rows: PercentRow[];
  accent?: string;
  emptyMessage?: string;
}

export function AttendancePercentBreakdown({
  title,
  rows,
  accent = '#2e7d32',
  emptyMessage = 'No attendance recorded yet',
}: Props) {
  if (!rows.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.empty}>{emptyMessage}</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {rows.map((row) => (
        <View key={row.key} style={styles.row}>
          <View style={styles.labelRow}>
            <View style={styles.labelBody}>
              <Text style={styles.label}>{row.label}</Text>
              {row.subtitle ? <Text style={styles.subtitle}>{row.subtitle}</Text> : null}
            </View>
            <Text style={[styles.percent, { color: accent }]}>
              {row.valueLabel || `${row.percent.toFixed(1)}%`}
            </Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                {
                  width: `${Math.max(Math.min(row.percent, 100), row.percent > 0 ? 4 : 0)}%`,
                  backgroundColor: accent,
                },
              ]}
            />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
  },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 12 },
  empty: { fontSize: 13, color: colors.textMuted, lineHeight: 18 },
  row: { marginBottom: 12 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labelBody: { flex: 1, marginRight: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333' },
  subtitle: { marginTop: 2, fontSize: 11, color: colors.textMuted, lineHeight: 16 },
  percent: { fontSize: 14, fontWeight: '800' },
  barTrack: {
    marginTop: 6,
    height: 8,
    backgroundColor: '#eef1f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
});
