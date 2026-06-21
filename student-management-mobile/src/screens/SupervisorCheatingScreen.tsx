import React, { useEffect, useState } from 'react';
import { colors } from '../theme/colors';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CheatingIncidentsPanel } from '../components/CheatingIncidentsPanel';
import { SupervisorExamSubjectStep } from '../components/SupervisorExamSubjectStep';
import { getApiErrorMessage } from '../services/apiClient';
import { todayDateString } from '../services/examAttendanceService';
import { getExamSubjects } from '../services/examScheduleService';
import { getMyCenterSummary } from '../services/supervisorMeService';
import { catalogLevelFromCenter } from '../utils/supervisorCenter';
import { ExamSubject } from '../types';
import { SupervisorCheatingStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<SupervisorCheatingStackParamList, 'SupervisorCheatingMain'>;

type Step = 'selectSubject' | 'incidents';

export function SupervisorCheatingScreen({ navigation }: Props) {
  const [step, setStep] = useState<Step>('selectSubject');
  const [centerName, setCenterName] = useState('');
  const [centerLevel, setCenterLevel] = useState<'Primary' | 'Secondary'>('Primary');
  const [centerRegion, setCenterRegion] = useState<string | null>(null);
  const [academicYear, setAcademicYear] = useState<string | undefined>();
  const [catalogSubjects, setCatalogSubjects] = useState<ExamSubject[]>([]);
  const [loadingCenter, setLoadingCenter] = useState(true);
  const [examDate, setExamDate] = useState(todayDateString());
  const [subject, setSubject] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoadingCenter(true);
      setError(null);
      try {
        const summary = await getMyCenterSummary();
        const level = catalogLevelFromCenter(summary.level);
        setCenterName(summary.centerName || summary.assignment?.centerName || 'My exam center');
        setCenterLevel(level);
        setCenterRegion(summary.region || summary.assignment?.region || null);
        setAcademicYear(summary.academicYear || summary.assignment?.academicYear);

        const subjects = await getExamSubjects({
          level,
          academicYear: summary.academicYear || summary.assignment?.academicYear,
        });
        setCatalogSubjects(subjects);
      } catch (e: unknown) {
        setError(getApiErrorMessage(e, 'Failed to load your exam center'));
      } finally {
        setLoadingCenter(false);
      }
    })();
  }, []);

  const handleContinue = () => {
    setStep('incidents');
    setError(null);
  };

  const handleChangeSubject = () => {
    setStep('selectSubject');
  };

  if (loadingCenter) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && step === 'selectSubject') {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  if (step === 'selectSubject') {
    return (
      <SupervisorExamSubjectStep
        centerName={centerName}
        centerLevel={centerLevel}
        region={centerRegion}
        academicYear={academicYear}
        subjects={catalogSubjects}
        loading={loadingCenter}
        examDate={examDate}
        selectedSubject={subject}
        onExamDateChange={(date) => {
          setExamDate(date);
          setSubject('');
        }}
        onSelectSubject={setSubject}
        onContinue={handleContinue}
        introText="Select the exam date and subject for cheating reports. You will then view and record incidents for that exam session in your center."
        continuePrefix="View reports"
      />
    );
  }

  return (
    <CheatingIncidentsPanel
      subject={subject}
      examDate={examDate}
      sessionBanner={{
        centerLevel: centerLevel,
        centerName,
        subject,
        examDate,
        onChangeSubject: handleChangeSubject,
      }}
      onOpenForm={(params) => navigation.navigate('CheatingForm', params)}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  error: { color: colors.error, textAlign: 'center', padding: 24, fontSize: 14 },
});
