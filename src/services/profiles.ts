import AsyncStorage from '@react-native-async-storage/async-storage';

const PROFILES_KEY = 'app-profiles';
const ACTIVE_PROFILE_KEY = 'active-profile-id';
const DEFAULT_PROFILE_ID = 'default';
const DEFAULT_DB_FILENAME = 'financeai.db'; // el archivo que ya usan todos los usuarios existentes

export interface AppProfile {
  id: string;
  name: string;
  dbFileName: string;
  createdAt: string;
}

function defaultProfile(): AppProfile {
  return {
    id: DEFAULT_PROFILE_ID,
    name: 'Principal',
    dbFileName: DEFAULT_DB_FILENAME,
    createdAt: new Date(0).toISOString(),
  };
}

export async function getProfiles(): Promise<AppProfile[]> {
  const raw = await AsyncStorage.getItem(PROFILES_KEY);
  if (!raw) return [defaultProfile()];
  try {
    const parsed = JSON.parse(raw) as AppProfile[];
    return parsed.length > 0 ? parsed : [defaultProfile()];
  } catch {
    return [defaultProfile()];
  }
}

async function saveProfiles(profiles: AppProfile[]): Promise<void> {
  await AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
}

export async function getActiveProfileId(): Promise<string> {
  const id = await AsyncStorage.getItem(ACTIVE_PROFILE_KEY);
  return id ?? DEFAULT_PROFILE_ID;
}

export async function getActiveProfile(): Promise<AppProfile> {
  const [profiles, activeId] = await Promise.all([getProfiles(), getActiveProfileId()]);
  return profiles.find((p) => p.id === activeId) ?? profiles[0] ?? defaultProfile();
}

export async function setActiveProfile(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_PROFILE_KEY, id);
}

export async function createProfile(name: string): Promise<AppProfile> {
  const profiles = await getProfiles();
  const newProfile: AppProfile = {
    id: `profile-${Date.now()}`,
    name: name.trim() || 'Nuevo perfil',
    dbFileName: `financeai-${Date.now()}.db`,
    createdAt: new Date().toISOString(),
  };
  await saveProfiles([...profiles, newProfile]);
  return newProfile;
}

export async function renameProfile(id: string, name: string): Promise<void> {
  const profiles = await getProfiles();
  const updated = profiles.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p));
  await saveProfiles(updated);
}

// Además de quitarlo de la lista, borra el archivo .db físico del
// dispositivo (expo-sqlite sí expone esta función).
export async function deleteProfile(id: string): Promise<void> {
  if (id === DEFAULT_PROFILE_ID) {
    throw new Error('No puedes eliminar el perfil principal');
  }
  const profiles = await getProfiles();
  const activeId = await getActiveProfileId();
  if (activeId === id) {
    throw new Error('Cambia a otro perfil antes de eliminar este');
  }

  const profile = profiles.find((p) => p.id === id);
  await saveProfiles(profiles.filter((p) => p.id !== id));

  if (profile) {
    const SQLite = await import('expo-sqlite');
    try {
      await SQLite.deleteDatabaseAsync(profile.dbFileName);
    } catch {
      // Si el archivo ya no existe o falla el borrado, no es crítico —
      // ya quitamos el perfil de la lista, que es lo que ve el usuario.
    }
  }
}
