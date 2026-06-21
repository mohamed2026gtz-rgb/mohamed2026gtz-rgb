import React from 'react';
import { colors } from '../theme/colors';
import { StyleSheet, Text, View } from 'react-native';
import { LevelCount } from '../types';

interface Props {
  title: string;
  items: LevelCount[];
  accent?: string;
}

export function LevelBreakdown({ title, items, accent = colors.primary }: Props) {
  if (!items.length) return null;
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {items.map((item) => (
        <View key={item.level} style={styles.row}>
          <View style={styles.labelRow}>
            <Text style={styles.level}>{item.level}</Text>
            <Text style={styles.count}>{item.count.toLocaleString()}</Text>
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.max((item.count / max) * 100, 4)}%`, backgroundColor: accent },
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
  row: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  level: { fontSize: 14, color: '#333', flex: 1 },
  count: { fontSize: 14, fontWeight: '600', color: colors.primary },
  barTrack: {
    height: 8,
    backgroundColor: '#eef1f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: { height: 8, borderRadius: 4 },
});
