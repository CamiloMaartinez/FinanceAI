import React, { createContext, useCallback, useContext, useRef } from 'react';
import { BrandCurtain, type BrandCurtainHandle, type CurtainSwap } from '../components/ui/BrandCurtain';

type RunCurtain = (swap: CurtainSwap) => Promise<void>;

// Sin proveedor (pruebas de una pantalla suelta) el cambio se aplica directo
const CurtainContext = createContext<RunCurtain>(async (swap) => {
  await swap();
});

/** Monta la cortina de marca encima de la app y la ofrece con `useCurtain`. */
export function CurtainProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<BrandCurtainHandle>(null);
  const run = useCallback<RunCurtain>(async (swap) => {
    if (ref.current) return ref.current.run(swap);
    await swap();
  }, []);

  return (
    <CurtainContext.Provider value={run}>
      {children}
      <BrandCurtain ref={ref} />
    </CurtainContext.Provider>
  );
}

/** `runCurtain(() => cambiarPantalla())`: tapa, cambia y destapa. */
export function useCurtain(): RunCurtain {
  return useContext(CurtainContext);
}
