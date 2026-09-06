import AsyncStorage from '@react-native-async-storage/async-storage';

const ONBOARDING_KEY_PREFIX = 'onboarding-completed';
const LEGACY_ONBOARDING_KEY = 'onboarding-completed'; // clave plana usada antes de que existieran los perfiles

export async function hasSeenOnboarding(profileId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(`${ONBOARDING_KEY_PREFIX}:${profileId}`);
  if (value === 'true') return true;

  // Compatibilidad con instalaciones de antes de que existieran los
  // perfiles: si el perfil "default" ya la había visto bajo la clave
  // vieja (sin sufijo), la migramos silenciosamente a la nueva y no la
  // volvemos a mostrar.
  if (profileId === 'default') {
    const legacyValue = await AsyncStorage.getItem(LEGACY_ONBOARDING_KEY);
    if (legacyValue === 'true') {
      await markOnboardingSeen(profileId);
      return true;
    }
  }

  return false;
}

export async function markOnboardingSeen(profileId: string): Promise<void> {
  await AsyncStorage.setItem(`${ONBOARDING_KEY_PREFIX}:${profileId}`, 'true');
}
