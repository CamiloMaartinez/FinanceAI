import { jest } from '@jest/globals';

// Se ejecuta antes de cada archivo de pruebas.
// - expo-sqlite → SQLite real de Node en memoria (ver sqliteAdapter.ts)
// - AsyncStorage → el mock oficial del paquete (guarda en memoria)
jest.mock('expo-sqlite', () => require('./sqliteAdapter'));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Pruebas de pantallas: animaciones (Reanimated 4 + Worklets) con sus mocks
// oficiales, y el selector de fecha nativo como un componente vacío
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));
require('react-native-reanimated').setUpTests();
// Hojas y gestos (Sheet, deslizar para confirmar): mock oficial de Gesture Handler
require('react-native-gesture-handler/jestSetup');
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const Picker = () => React.createElement('DateTimePicker');
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn(), dismiss: jest.fn() } };
});

// node:sqlite avisa que es experimental; no aporta nada en la salida de pruebas
const originalEmitWarning = process.emitWarning;
process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
  const text = typeof warning === 'string' ? warning : warning.message;
  if (text.includes('SQLite')) return;
  return (originalEmitWarning as (...args: unknown[]) => void).call(process, warning, ...rest);
}) as typeof process.emitWarning;
