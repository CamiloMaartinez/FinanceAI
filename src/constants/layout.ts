// Barra de pestañas flotante (src/components/navigation/AnimatedTabBar.tsx):
// una píldora separada del borde inferior. Las pantallas usan
// TAB_BAR_HEIGHT como padding inferior extra para que lo último de la
// lista no quede debajo de la barra.
export const TAB_BAR_PILL_HEIGHT = 64;

/** Separación mínima entre la píldora y el borde cuando no hay área segura. */
export const TAB_BAR_GAP = 12;

// Alto de la píldora + el área segura inferior más grande habitual (34 en
// iPhone con Face ID; en Android con gestos es menor) + un respiro.
export const TAB_BAR_HEIGHT = TAB_BAR_PILL_HEIGHT + 34 + TAB_BAR_GAP;
