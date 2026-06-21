import React from 'react';
import { colors } from '../theme/colors';
import { StyleSheet, Text, View } from 'react-native';
import { RegionSummary as RegionSummaryType } from '../types';

interface Props {
  items: RegionSummaryType[];
}

export function RegionSummary({ items }: Props) {
  if (!items.length) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>By region (schools + students)</Text>
      {items.map((item) => (
        <View key={item.region} style={styles.row}>
          <Text style={styles.region}>{item.region}</Text>
          <Text style={styles.counts}>
            {item.schoolCount} schools · {item.studentCount.toLocaleString()} students
          </Text>
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
  row: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f6',
  },
  region: { fontSize: 14, fontWeight: '600', color: '#333' },
  counts: { marginTop: 2, fontSize: 13, color: colors.textSecondary },
});
