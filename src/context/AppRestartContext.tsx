import { createContext, useContext } from 'react';

/**
 * Vuelve a arrancar la app con el perfil activo (base de datos, recurrentes,
 * alertas…) sin cerrarla. Lo provee la raíz (app/_layout.tsx); termina cuando
 * la app nueva ya está lista para mostrarse.
 */
export const AppRestartContext = createContext<() => Promise<void>>(async () => {});

export function useAppRestart(): () => Promise<void> {
  return useContext(AppRestartContext);
}
