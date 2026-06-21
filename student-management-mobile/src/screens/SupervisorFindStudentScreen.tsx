import React, { useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StudentIdCard } from '../components/StudentIdCard';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/apiClient';
import {
  downloadMyCenterStudentPhotoUri,
  lookupMyCenterStudent,
} from '../services/supervisorMeService';
import { Student } from '../types';

export function SupervisorFindStudentScreen() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [student, setStudent] = useState<
    (Student & { examCenterName?: string; academicYear?: string }) | null
  >(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const assignment = user?.supervisorAssignment;

  const handleSearch = async () => {
    const term = query.trim();
    if (!term) {
      setError('Enter unique ID or student number');
      return;
    }

    setLoading(true);
    setError(null);
    setStudent(null);
    setPhotoUri(null);

    try {
      const data = await lookupMyCenterStudent(term);
      setStudent(data);

      if (data.hasPicture) {
        setPhotoLoading(true);
        try {
          const uri = await downloadMyCenterStudentPhotoUri(data.studentNo);
          setPhotoUri(uri);
        } catch {
          setPhotoUri(null);
        } finally {
          setPhotoLoading(false);
        }
      }
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, 'Student not found in your exam center'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hint}>
          Search students in your assigned exam center only. View official photo and ID card.
        </Text>

        <View style={styles.searchBox}>
          <Text style={styles.label}>Unique ID or Student Number</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 19-006148"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <Pressable
            style={[styles.searchBtn, loading && styles.disabled]}
            onPress={handleSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.searchBtnText}>Find student & show ID card</Text>
            )}
          </Pressable>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {student ? (
          <StudentIdCard
            student={student}
            photoUri={photoUri}
            photoLoading={photoLoading}
            examCenterName={student.examCenterName || assignment?.centerName}
            academicYear={student.academicYear || assignment?.academicYear}
          />
        ) : null}

        {!student && !loading && !error ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Student ID verification</Text>
            <Text style={styles.emptyText}>
              Enter a student unique ID or registration number to display their examination ID
              card with photo, name, and school details.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: 32 },
  hint: {
    margin: 12,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  searchBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: 12, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    backgroundColor: '#f8faff',
    borderWidth: 1,
    borderColor: '#dde3ee',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  searchBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  searchBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
  disabled: { opacity: 0.7 },
  error: { color: colors.error, textAlign: 'center', marginHorizontal: 12, marginBottom: 8 },
  empty: {
    margin: 24,
    padding: 20,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e8eaf6',
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
