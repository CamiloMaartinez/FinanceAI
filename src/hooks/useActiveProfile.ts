import { useCallback, useEffect, useState } from 'react';
import { getActiveProfile, onProfilesChanged, type AppProfile } from '../services/profiles';
import { getProfile } from '../services/profile';

/**
 * Perfil activo (con su avatar) y el nombre a mostrar. Se actualiza solo
 * cuando cambia un avatar desde cualquier pantalla.
 */
export function useActiveProfile() {
  const [profile, setProfile] = useState<AppProfile | null>(null);
  const [displayName, setDisplayName] = useState('');

  const load = useCallback(async () => {
    const [active, user] = await Promise.all([getActiveProfile(), getProfile()]);
    setProfile(active);
    // El nombre que el usuario escribió en Perfil manda; si no lo cambió, el del perfil
    setDisplayName(user.name && user.name !== 'Mi Perfil' ? user.name : active.name);
  }, []);

  useEffect(() => {
    load().catch(() => {});
    return onProfilesChanged(() => { load().catch(() => {}); });
  }, [load]);

  return { profile, displayName, refresh: load };
}
