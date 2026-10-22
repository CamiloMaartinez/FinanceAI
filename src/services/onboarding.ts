import AsyncStorage from '@react-native-async-storage/async-storage';
import type { InterestId } from '../utils/onboardingPlan';
import { renameProfile } from './profiles';
import { updateProfile } from './profile';

const ONBOARDING_KEY_PREFIX = 'onboarding-completed';
const LEGACY_ONBOARDING_KEY = 'onboarding-completed'; // clave plana usada antes de que existieran los perfiles
const INTERESTS_KEY_PREFIX = 'onboarding-interests';
const DEFAULT_PROFILE_ID = 'default';

export async function hasSeenOnboarding(profileId: string): Promise<boolean> {
  const value = await AsyncStorage.getItem(`${ONBOARDING_KEY_PREFIX}:${profileId}`);
  if (value === 'true') return true;

  // Compatibilidad con instalaciones de antes de que existieran los
  // perfiles: si el perfil "default" ya la había visto bajo la clave
  // vieja (sin sufijo), la migramos silenciosamente a la nueva y no la
  // volvemos a mostrar.
  if (profileId === DEFAULT_PROFILE_ID) {
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

/** Vuelve a mostrar la introducción en el próximo arranque de este perfil. */
export async function resetOnboarding(profileId: string): Promise<void> {
  await AsyncStorage.removeItem(`${ONBOARDING_KEY_PREFIX}:${profileId}`);
  if (profileId === DEFAULT_PROFILE_ID) await AsyncStorage.removeItem(LEGACY_ONBOARDING_KEY);
}

export interface OnboardingAnswers {
  name: string;
  interests: InterestId[];
}

/**
 * Guarda lo que el usuario contó en la bienvenida.
 * - El nombre pasa a ser el del perfil activo (lo usan el saludo y el avatar).
 *   En el perfil principal también se guarda en "Perfil", que es el nombre
 *   que manda ahí.
 * - Los intereses quedan por perfil, para que otras pantallas puedan
 *   priorizar lo que le importa.
 */
export async function saveOnboardingAnswers(profileId: string, answers: OnboardingAnswers): Promise<void> {
  const name = answers.name.trim();
  if (name) {
    await renameProfile(profileId, name);
    if (profileId === DEFAULT_PROFILE_ID) await updateProfile({ name });
  }
  await AsyncStorage.setItem(`${INTERESTS_KEY_PREFIX}:${profileId}`, JSON.stringify(answers.interests));
}

/** Intereses elegidos en la bienvenida (vacío si la saltó o es una instalación vieja). */
export async function getOnboardingInterests(profileId: string): Promise<InterestId[]> {
  const raw = await AsyncStorage.getItem(`${INTERESTS_KEY_PREFIX}:${profileId}`);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed.filter((v) => typeof v === 'string') as InterestId[]) : [];
  } catch {
    return [];
  }
}
