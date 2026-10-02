import { Platform } from 'react-native';

// Alto de la tab bar (coincide con app/(tabs)/_layout.tsx). Ahora que la
// barra flota sobre el contenido con blur (§12 apple-design: "content
// scrolls under it"), cada pantalla necesita este valor como padding
// inferior extra para que lo último de la lista no quede tapado.
export const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 60;
