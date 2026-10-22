import { useEffect, useState } from 'react';
import { getAllAccounts, getAllCategories } from '../database/db';
import { parseVoiceCommand, type VoiceCommand } from '../utils/voiceCommand';

/**
 * ViewModel de la pantalla /comando: carga las cuentas y categorías del
 * perfil activo y entiende la frase dictada (por Siri o por el teclado).
 * `command` es null mientras carga.
 */
export function useVoiceCommand(text: string | undefined) {
  const [command, setCommand] = useState<VoiceCommand | null>(null);

  useEffect(() => {
    let cancelled = false;
    setCommand(null);
    (async () => {
      try {
        const [accounts, categories] = await Promise.all([getAllAccounts(), getAllCategories()]);
        if (!cancelled) setCommand(parseVoiceCommand(text ?? '', { accounts, categories }));
      } catch {
        // Sin base de datos todavía se entienden la navegación y los montos
        if (!cancelled) setCommand(parseVoiceCommand(text ?? ''));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [text]);

  return { command };
}
