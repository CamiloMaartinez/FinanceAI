import React from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useColors, radius, spacing } from '../../constants/theme';

/** El asa gris de las hojas. La comparten `Sheet` (modal) y `BottomSheetCard`. */
export function SheetHandle() {
  const c = useColors();
  return (
    <View
      accessible={false}
      style={{
        alignSelf: 'center',
        width: 40,
        height: 5,
        borderRadius: radius.pill,
        backgroundColor: c.borderStrong,
        marginBottom: spacing.md,
      }}
    />
  );
}

interface BottomSheetCardProps {
  children: React.ReactNode;
  /** Muestra el asa. Es decorativa: esta hoja no se arrastra. */
  handle?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Hoja blanca con esquinas superiores de 32 que se superpone al encabezado
 * (la lista de activos de la referencia). A diferencia de `Sheet`, no es
 * un modal: va dentro del contenido de la pantalla.
 */
export function BottomSheetCard({ children, handle = true, style }: BottomSheetCardProps) {
  const c = useColors();
  return (
    <View
      style={[
        {
          backgroundColor: c.sheet,
          borderTopLeftRadius: radius.sheet,
          borderTopRightRadius: radius.sheet,
          paddingTop: spacing.md,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xl,
          ...c.shadow.md,
        },
        style,
      ]}
    >
      {handle && <SheetHandle />}
      {children}
    </View>
  );
}
