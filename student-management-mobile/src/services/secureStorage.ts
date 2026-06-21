import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const LEGACY_TOKEN_KEY = 'auth_token';

/** Auth tokens are stored in the OS secure vault (Keychain / EncryptedSharedPreferences). */
export async function getSecureToken(): Promise<string | null> {
  try {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) return token;

    // One-time migration from legacy AsyncStorage.
    const legacy = await AsyncStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSecureToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await AsyncStorage.removeItem(LEGACY_TOKEN_KEY);
  }
}
