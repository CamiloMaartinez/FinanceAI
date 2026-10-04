import { jest } from '@jest/globals';

// Se ejecuta antes de cada archivo de pruebas.
// - expo-sqlite → SQLite real de Node en memoria (ver sqliteAdapter.ts)
// - AsyncStorage → el mock oficial del paquete (guarda en memoria)
jest.mock('expo-sqlite', () => require('./sqliteAdapter'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// node:sqlite avisa que es experimental; no aporta nada en la salida de pruebas
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const text = typeof warning === 'string' ? warning : warning.message;
  if (text.includes('SQLite')) return;
  return (originalEmitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
}) as typeof process.emitWarning;
