import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILE_KEY = 'financeai_profile';

export interface UserProfile {
  name: string;
  joinedAt: string; // ISO string
  faceIdEnabled: boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'Mi Perfil',
  joinedAt: new Date().toISOString(),
  faceIdEnabled: true,
};

export async function getProfile(): Promise<UserProfile> {
  try {
    const stored = await AsyncStorage.getItem(PROFILE_KEY);
    if (stored) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(stored) };
    }
    // Primera vez — guardar perfil por defecto
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(DEFAULT_PROFILE));
    return DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function updateProfile(updates: Partial<UserProfile>): Promise<void> {
  try {
    const current = await getProfile();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
  } catch {
    // Si falla, ignoramos silenciosamente
  }
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.clear();
}