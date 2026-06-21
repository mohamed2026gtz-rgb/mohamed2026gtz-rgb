import React, { useCallback, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getCheatingIncidents } from '../services/cheatingService';
import { CheatingIncident } from '../types';

interface SessionBanner {
  centerLevel: string;
  centerName: string;
  subject: string;
  examDate: string;
  onChangeSubject: () => void;
}

interface Props {
  subject?: string;
  examDate?: string;
  sessionBanner?: SessionBanner;
  onOpenForm: (params: { id?: number; subject?: string; examDate?: string }) => void;
}

export function CheatingIncidentsPanel({ subject, examDate, sessionBanner, onOpenForm }: Props) {
  const [items, setItems] = useState<CheatingIncident[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      const result = await getCheatingIncidents({
        search: search.trim() || undefined,
        examDate: examDate?.trim() || undefined,
        subject: subject?.trim() || undefined,
        pageSize: 100,
      });
      setItems(result.items);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [examDate, search, subject]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={styles.container}>
      {sessionBanner ? (
        <View style={styles.sessionBanner}>
          <View style={styles.sessionBannerBody}>
            <Text style={styles.sessionBannerLabel}>
              {sessionBanner.centerLevel} · {sessionBanner.centerName}
            </Text>
            <Text style={styles.sessionBannerSubject}>{sessionBanner.subject}</Text>
            <Text style={styles.sessionBannerDate}>{sessionBanner.examDate}</Text>
          </View>
          <Pressable onPress={sessionBanner.onChangeSubject}>
            <Text style={styles.changeLink}>Change</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search student, subject..."
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={() => load()}
          returnKeyType="search"
        />
        <Pressable
          style={styles.addBtn}
          onPress={() => onOpenForm({ subject, examDate })}
        >
          <Text style={styles.addBtnText}>+ Report</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {subject
                ? `No cheating incidents for ${subject}${examDate ? ` on ${examDate}` : ''}.`
                : 'No cheating incidents recorded yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => onOpenForm({ id: item.id, subject, examDate })}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.studentName}>{item.studentName || item.studentNo}</Text>
                <View style={[styles.badge, severityStyle(item.severity)]}>
                  <Text style={styles.badgeText}>{item.severity}</Text>
                </View>
              </View>
              <Text style={styles.meta}>
                {item.examDate} · {item.subject}
                {item.examShift ? ` · Shift ${item.examShift}` : ''}
              </Text>
              <Text style={styles.type}>{item.cheatingTypeLabel || 'Unspecified type'}</Text>
              <Text style={styles.desc} numberOfLines={2}>
                {item.incidentDescription}
              </Text>
              <Text style={styles.footer}>
                Status: {item.status}
                {item.invigilatorName ? ` · Invigilator: ${item.invigilatorName}` : ''}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function severityStyle(severity: string) {
  if (severity === 'Severe') return { backgroundColor: '#ffcdd2' };
  if (severity === 'Serious') return { backgroundColor: '#ffe0b2' };
  if (severity === 'Moderate') return { backgroundColor: '#fff9c4' };
  return { backgroundColor: colors.successBg };
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  sessionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginBottom: 0,
    padding: 14,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: '#c62828',
  },
  sessionBannerBody: { flex: 1 },
  sessionBannerLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase' },
  sessionBannerSubject: { marginTop: 4, fontSize: 16, fontWeight: '800', color: colors.primary },
  sessionBannerDate: { marginTop: 2, fontSize: 13, color: '#555' },
  changeLink: { color: colors.primary, fontWeight: '700', fontSize: 13, padding: 8 },
  toolbar: { flexDirection: 'row', padding: 12, gap: 8 },
  search: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  addBtn: {
    backgroundColor: '#c62828',
    borderRadius: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  addBtnText: { color: colors.white, fontWeight: '700' },
  list: { padding: 12, paddingBottom: 24 },
  empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eceff1',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  studentName: { fontSize: 16, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  meta: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  type: { marginTop: 6, fontSize: 13, fontWeight: '600', color: colors.error },
  desc: { marginTop: 4, fontSize: 13, color: '#444', lineHeight: 18 },
  footer: { marginTop: 8, fontSize: 11, color: colors.textMuted },
});
