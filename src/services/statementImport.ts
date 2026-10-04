import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { decodeWindows1252, looksMisdecoded } from '../utils/csvImport';

// Deja elegir el CSV del extracto (Archivos, OneDrive, correo...) y lo
// devuelve como texto. Si el banco lo exportó en Windows-1252 en lugar de
// UTF-8, lo vuelve a decodificar para que las tildes salgan bien.
export async function pickStatementFile(): Promise<{ name: string; text: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'application/csv', 'text/plain', 'application/vnd.ms-excel'],
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (/\.(xlsx?|pdf)$/i.test(asset.name)) {
    throw new Error('Ese archivo no es CSV. En la web o app de tu banco, descarga el extracto en formato CSV.');
  }

  const file = new File(asset.uri);
  let text = await file.text();
  if (looksMisdecoded(text)) text = decodeWindows1252(await file.bytes());
  return { name: asset.name, text };
}
