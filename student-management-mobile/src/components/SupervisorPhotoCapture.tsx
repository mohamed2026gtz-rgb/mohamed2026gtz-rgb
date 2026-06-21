import React, { useRef, useState } from 'react';
import { colors } from '../theme/colors';
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

interface Props {
  photoUri: string | null;
  onPhotoChange: (uri: string | null) => void;
}

export function SupervisorPhotoCapture({ photoUri, onPhotoChange }: Props) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);

  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission needed', 'Camera access is required to take a supervisor photo.');
        return;
      }
    }
    setShowCamera(true);
  };

  const capture = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      onPhotoChange(photo.uri);
      setShowCamera(false);
    }
  };

  const pickFromGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission needed', 'Allow access to your photos to upload a supervisor picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      onPhotoChange(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Supervisor photo</Text>
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.preview} />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>No photo yet</Text>
        </View>
      )}
      <View style={styles.row}>
        <Pressable style={styles.btn} onPress={openCamera}>
          <Text style={styles.btnText}>{photoUri ? 'Retake photo' : 'Take photo'}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.btnSecondary]} onPress={pickFromGallery}>
          <Text style={styles.btnText}>{photoUri ? 'Replace upload' : 'Upload photo'}</Text>
        </Pressable>
      </View>
      {photoUri ? (
        <Pressable style={styles.removeBtn} onPress={() => onPhotoChange(null)}>
          <Text style={styles.removeBtnText}>Remove photo</Text>
        </Pressable>
      ) : null}

      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraWrap}>
          <CameraView ref={cameraRef} style={styles.camera} facing="front" />
          <View style={styles.cameraActions}>
            <Pressable style={styles.captureBtn} onPress={capture}>
              <Text style={styles.captureText}>Capture</Text>
            </Pressable>
            <Pressable onPress={() => setShowCamera(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 8 },
  preview: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginBottom: 10 },
  placeholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: colors.textMuted, fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: 8 },
  btn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  btnSecondary: { backgroundColor: '#3949ab' },
  btnText: { color: colors.white, fontWeight: '600' },
  removeBtn: { alignSelf: 'center', marginTop: 8, padding: 6 },
  removeBtnText: { color: colors.error, fontWeight: '600', fontSize: 13 },
  cameraWrap: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraActions: {
    padding: 20,
    backgroundColor: '#111',
    alignItems: 'center',
    gap: 12,
  },
  captureBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  captureText: { color: colors.white, fontWeight: '700' },
  cancelText: { color: '#ccc', fontWeight: '600' },
});
