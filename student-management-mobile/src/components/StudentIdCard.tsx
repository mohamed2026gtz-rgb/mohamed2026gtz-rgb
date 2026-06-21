import React from 'react';
import { colors } from '../theme/colors';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { Student } from '../types';

export interface StudentIdCardProps {
  student: Student;
  photoUri?: string | null;
  photoLoading?: boolean;
  examCenterName?: string;
  academicYear?: string;
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

export function StudentIdCard({
  student,
  photoUri,
  photoLoading,
  examCenterName,
  academicYear,
}: StudentIdCardProps) {
  return (
    <View style={styles.cardOuter}>
      <View style={styles.card}>
        <View style={styles.headerBand}>
          <Text style={styles.headerOrg}>STUDENT MANAGEMENT SYSTEM</Text>
          <Text style={styles.headerTitle}>EXAMINATION ID CARD</Text>
          {examCenterName ? (
            <Text style={styles.headerCenter} numberOfLines={2}>
              {examCenterName}
            </Text>
          ) : null}
        </View>

        <View style={styles.body}>
          <View style={styles.photoFrame}>
            {photoLoading ? (
              <ActivityIndicator color={colors.primary} style={styles.photoLoader} />
            ) : photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderText}>NO PHOTO</Text>
              </View>
            )}
          </View>

          <View style={styles.details}>
            <Text style={styles.studentName} numberOfLines={2}>
              {student.fullName || '—'}
            </Text>

            <InfoRow label="Unique ID" value={student.studentNo} />
            <InfoRow
              label="Student No"
              value={student.registrationNo || student.studentNo}
            />
            <InfoRow label="Sex" value={student.sex} />
            <InfoRow label="School" value={student.schoolName} />
            <InfoRow label="Region" value={student.region} />
            <InfoRow label="Level" value={student.schoolLevel || student.level} />
          </View>
        </View>

        <View style={styles.footerBand}>
          <Text style={styles.footerText}>
            {academicYear ? `Academic Year ${academicYear}` : 'Official examination record'}
          </Text>
          <View style={styles.barcodeStrip}>
            {Array.from({ length: 28 }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.barcodeLine,
                  { width: i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1 },
                ]}
              />
            ))}
          </View>
          <Text style={styles.footerId}>{student.studentNo}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.primaryMuted,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
  headerBand: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  headerOrg: {
    color: '#9fa8da',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 0.5,
  },
  headerCenter: {
    color: '#e8eaf6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  body: {
    flexDirection: 'row',
    padding: 16,
    gap: 14,
    backgroundColor: colors.surfaceMuted,
  },
  photoFrame: {
    width: 108,
    height: 132,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: '#eef1f6',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoLoader: { marginTop: 48 },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  photoPlaceholderText: {
    color: '#7986cb',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  details: { flex: 1, justifyContent: 'center' },
  studentName: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 10,
    lineHeight: 22,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 5,
    alignItems: 'flex-start',
  },
  infoLabel: {
    width: 82,
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  footerBand: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#c5cae9',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 6,
  },
  barcodeStrip: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 22,
    gap: 2,
    marginBottom: 4,
  },
  barcodeLine: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 1,
  },
  footerId: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
  },
});
