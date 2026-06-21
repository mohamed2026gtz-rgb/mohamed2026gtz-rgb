import React, { useRef, useState } from 'react';
import { colors } from '../theme/colors';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { getApiErrorMessage } from '../services/apiClient';
import { AuthStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'StudentFaceLogin'>;

export function StudentFaceLoginScreen() {
  const navigation = useNavigation<Nav>();
  const { loginStudentWithFace } = useAuth();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [studentNo, setStudentNo] = useState('');
  const [step, setStep] = useState<'id' | 'camera' | 'preview'>('id');
  const [selfieUri, setSelfieUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const startCameraStep = async () => {
    if (!studentNo.trim()) {
      Alert.alert('Validation', 'Enter your Unique ID or Student Number');
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Camera required', 'Allow camera access for face verification');
        return;
      }
    }
    setStep('camera');
    setStatus(null);
  };

  const captureSelfie = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 0.75,
        skipProcessing: false,
      });
      if (!photo?.uri) {
        Alert.alert('Camera', 'Could not capture photo — try again');
        return;
      }
      setSelfieUri(photo.uri);
      setStep('preview');
    } catch {
      Alert.alert('Camera', 'Failed to capture selfie');
    }
  };

  const verifyAndLogin = async () => {
    if (!selfieUri) return;
    setLoading(true);
    setStatus(null);
    try {
      const result = await loginStudentWithFace(studentNo.trim(), selfieUri);
      const distance =
        result.verification?.distance != null
          ? ` (match score distance: ${result.verification.distance})`
          : '';
      Alert.alert('Verified', `Face matched saved photo${distance}. Welcome!`);
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, 'Face verification failed');
      setStatus(msg);
      Alert.alert('Not verified', msg);
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
        <Text style={styles.title}>Student Login</Text>
        <Text style={styles.subtitle}>
          Enter your ID, then verify your face against the photo saved in the database.
        </Text>

        {step === 'id' && (
          <>
            <Text style={styles.label}>Unique ID / Student Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. student unique ID"
              autoCapitalize="none"
              value={studentNo}
              onChangeText={setStudentNo}
            />
            <Pressable style={styles.primaryBtn} onPress={startCameraStep}>
              <Text style={styles.primaryBtnText}>Continue to face verification</Text>
            </Pressable>
          </>
        )}

        {step === 'camera' && permission?.granted && (
          <View style={styles.cameraWrap}>
            <CameraView ref={cameraRef} style={styles.camera} facing="front">
              <View style={styles.cameraOverlay}>
                <Text style={styles.cameraHint}>Center your face in the frame</Text>
              </View>
            </CameraView>
            <Pressable style={styles.primaryBtn} onPress={captureSelfie}>
              <Text style={styles.primaryBtnText}>Capture selfie</Text>
            </Pressable>
            <Pressable style={styles.linkBtn} onPress={() => setStep('id')}>
              <Text style={styles.linkText}>Back</Text>
            </Pressable>
          </View>
        )}

        {step === 'preview' && selfieUri && (
          <View>
            <Text style={styles.label}>Preview selfie</Text>
            <Image source={{ uri: selfieUri }} style={styles.preview} />
            <Text style={styles.meta}>Student ID: {studentNo.trim()}</Text>
            <Pressable
              style={[styles.primaryBtn, loading && styles.disabled]}
              onPress={verifyAndLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Verify face & sign in</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.linkBtn}
              onPress={() => {
                setSelfieUri(null);
                setStep('camera');
              }}
              disabled={loading}
            >
              <Text style={styles.linkText}>Retake photo</Text>
            </Pressable>
          </View>
        )}

        {status ? <Text style={styles.error}>{status}</Text> : null}

        <Pressable style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>← Back to staff login</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: colors.primary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginVertical: 12, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
  disabled: { opacity: 0.7 },
  linkBtn: { marginTop: 12, alignItems: 'center' },
  backLink: { marginTop: 24, alignItems: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
  cameraWrap: { marginTop: 8 },
  camera: { width: '100%', height: 360, borderRadius: 12, overflow: 'hidden' },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  cameraHint: { color: colors.white, textAlign: 'center', fontWeight: '600' },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#ddd',
  },
  meta: { fontSize: 13, color: '#555', marginBottom: 8, textAlign: 'center' },
  error: { color: colors.error, textAlign: 'center', marginTop: 12 },
});
