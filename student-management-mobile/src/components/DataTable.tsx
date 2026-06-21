import React from 'react';
import { ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radii, shadows } from '../theme/colors';

export interface DataTableColumn<T> {
  key: string;
  title: string;
  width: number;
  align?: 'left' | 'center' | 'right';
  render: (item: T, rowIndex: number) => React.ReactNode;
}

interface Props<T> {
  title?: string;
  subtitle?: string;
  columns: DataTableColumn<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  emptyMessage?: string;
  style?: ViewStyle;
}

export function DataTable<T>({
  title,
  subtitle,
  columns,
  data,
  keyExtractor,
  emptyMessage = 'No records',
  style,
}: Props<T>) {
  const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);

  return (
    <View style={[styles.wrap, style]}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator bounces={false}>
        <View style={[styles.table, { minWidth: tableWidth }]}>
          <View style={styles.headerRow}>
            {columns.map((col) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  { width: col.width },
                  col.align === 'center' && styles.alignCenter,
                  col.align === 'right' && styles.alignRight,
                ]}
              >
                <Text style={styles.headerText}>{col.title}</Text>
              </View>
            ))}
          </View>

          {data.length === 0 ? (
            <View style={styles.emptyRow}>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          ) : (
            data.map((item, rowIndex) => (
              <View
                key={keyExtractor(item, rowIndex)}
                style={[styles.bodyRow, rowIndex % 2 === 1 && styles.bodyRowAlt]}
              >
                {columns.map((col) => (
                  <View
                    key={col.key}
                    style={[
                      styles.bodyCell,
                      { width: col.width },
                      col.align === 'center' && styles.alignCenter,
                      col.align === 'right' && styles.alignRight,
                    ]}
                  >
                    {col.render(item, rowIndex)}
                  </View>
                ))}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export function TableText({
  children,
  bold,
  muted,
  center,
}: {
  children: React.ReactNode;
  bold?: boolean;
  muted?: boolean;
  center?: boolean;
}) {
  return (
    <Text
      style={[
        styles.cellText,
        bold && styles.cellTextBold,
        muted && styles.cellTextMuted,
        center && styles.alignCenterText,
      ]}
      numberOfLines={2}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 12,
    marginBottom: 16,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadows.card,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryDark,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  table: { backgroundColor: colors.surface },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: colors.primaryDark,
    borderBottomWidth: 1,
    borderBottomColor: colors.primary,
  },
  headerCell: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  headerText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  bodyRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 48,
  },
  bodyRowAlt: { backgroundColor: colors.surfaceMuted },
  bodyCell: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  cellText: { fontSize: 13, color: colors.text },
  cellTextBold: { fontWeight: '600' },
  cellTextMuted: { color: colors.textSecondary, fontSize: 12 },
  alignCenter: { alignItems: 'center' },
  alignRight: { alignItems: 'flex-end' },
  alignCenterText: { textAlign: 'center' },
  emptyRow: { padding: 24, alignItems: 'center' },
  emptyText: { color: colors.textMuted, fontSize: 14 },
});
