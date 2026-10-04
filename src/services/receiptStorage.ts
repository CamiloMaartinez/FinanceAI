import { Directory, File, Paths } from 'expo-file-system';

// Fotos de recibos guardadas junto a cada movimiento.
//
// En la base de datos se guarda solo la ruta RELATIVA ("receipts/xyz.jpg"):
// en iOS la ruta absoluta de la carpeta de la app cambia entre
// actualizaciones, así que la URI completa se reconstruye cada vez.
const RECEIPTS_DIR = 'receipts';

function receiptsDirectory(): Directory {
  const dir = new Directory(Paths.document, RECEIPTS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

// Copia la foto (de la cámara o la galería, que vive en una carpeta
// temporal) a la carpeta permanente de la app. Devuelve la ruta relativa.
export function saveReceiptPhoto(sourceUri: string): string {
  const extension = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  const name = `rcpt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const destination = new File(receiptsDirectory(), name);
  new File(sourceUri).copy(destination);
  return `${RECEIPTS_DIR}/${name}`;
}

// URI para mostrar la foto, o null si el archivo ya no existe (por ejemplo,
// tras restaurar un respaldo en otro teléfono: el respaldo no incluye fotos).
export function resolveReceiptUri(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const file = new File(Paths.document, relativePath);
  return file.exists ? file.uri : null;
}

export function deleteReceiptPhoto(relativePath: string | null | undefined): void {
  if (!relativePath) return;
  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) file.delete();
  } catch {
    // Si no se puede borrar, solo queda un archivo huérfano: no es grave
  }
}
