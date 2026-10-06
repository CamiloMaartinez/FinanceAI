import { Directory, File, Paths } from 'expo-file-system';

// Fotos de perfil. Igual que los recibos: se copian desde la carpeta
// temporal del selector a la carpeta permanente de la app, y en el perfil
// se guarda solo la ruta RELATIVA (en iOS la absoluta cambia al actualizar).
const AVATARS_DIR = 'avatars';

function avatarsDirectory(): Directory {
  const dir = new Directory(Paths.document, AVATARS_DIR);
  dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Copia la foto elegida y devuelve su ruta relativa ("avatars/…"). */
export function saveAvatarPhoto(sourceUri: string, profileId: string): string {
  const extension = sourceUri.split('?')[0].split('.').pop()?.toLowerCase() || 'jpg';
  // Nombre nuevo en cada cambio: así ninguna imagen en caché muestra la foto vieja
  const name = `${profileId}-${Date.now()}.${extension}`;
  new File(sourceUri).copy(new File(avatarsDirectory(), name));
  return `${AVATARS_DIR}/${name}`;
}

/** URI para mostrar la foto, o null si el archivo ya no existe. */
export function resolveAvatarUri(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  try {
    const file = new File(Paths.document, relativePath);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

export function deleteAvatarPhoto(relativePath: string | null | undefined): void {
  if (!relativePath) return;
  try {
    const file = new File(Paths.document, relativePath);
    if (file.exists) file.delete();
  } catch {
    // Un archivo huérfano no es grave
  }
}
