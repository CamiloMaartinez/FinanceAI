import React from 'react';
import { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';

// Set propio de íconos (cuadrícula de 24). Cada ícono tiene dos capas:
//   - `accent`: formas rellenas con el color de acento (va primero, debajo)
//   - `stroke`: el dibujo de línea, trazo grueso y redondeado
// AppIcon pone los atributos comunes (color, grosor, puntas redondas).

export interface IconParts {
  /** Nombre visible en el selector de íconos. */
  label: string;
  accent?: React.ReactNode;
  stroke: React.ReactNode;
}

const dot = (cx: number, cy: number, r = 1.1) => <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

export const ICON_SET = {
  comida: {
    label: 'Comida',
    accent: <Path d="M4 12h16a8 8 0 0 1-16 0z" />,
    stroke: <>
      <Path d="M4 12h16a8 8 0 0 1-16 0z" />
      <Path d="M9 4.5c-.8 1 .8 2 0 3" />
      <Path d="M12.5 3.5c-.8 1 .8 2.5 0 4" />
      <Path d="M16 4.5c-.8 1 .8 2 0 3" />
    </>,
  },
  supermercado: {
    label: 'Supermercado',
    accent: <Path d="M6.6 8H20l-1.6 6.4a1 1 0 0 1-1 .8H8.3z" />,
    stroke: <>
      <Path d="M3 4h2.2l2.3 10.4a1 1 0 0 0 1 .8h8.9a1 1 0 0 0 1-.8L20 8H6.2" />
      <Circle cx={9.5} cy={19} r={1.4} />
      <Circle cx={17} cy={19} r={1.4} />
    </>,
  },
  transporte: {
    label: 'Transporte',
    accent: <Path d="M7.4 11.5 8.6 8h6.8l1.2 3.5z" />,
    stroke: <>
      <Path d="M4 17v-4.6L6.4 7a2 2 0 0 1 1.8-1.2h7.6A2 2 0 0 1 17.6 7L20 12.4V17a1 1 0 0 1-1 1h-1.3a1 1 0 0 1-1-1v-1H7.3v1a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <Path d="M4 12.5h16" />
      {dot(7.5, 14.4)}
      {dot(16.5, 14.4)}
    </>,
  },
  hogar: {
    label: 'Hogar',
    accent: <Path d="M10 21v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21z" />,
    stroke: <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" />
      <Path d="M10 21v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V21" />
    </>,
  },
  servicios: {
    label: 'Servicios',
    accent: <Path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />,
    stroke: <>
      <Path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
      <Path d="M9.5 18.5h5" />
      <Path d="M10.5 21h3" />
      <Path d="m12.6 7-1.6 2.8h2.2L11.6 12.6" />
    </>,
  },
  salud: {
    label: 'Salud',
    accent: <Path d="M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20z" />,
    stroke: <>
      <Path d="M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.5 12 20 12 20z" />
      <Path d="M7.5 12h2.2l1.4-2.4 1.9 4.6 1.4-2.2h2.1" />
    </>,
  },
  educacion: {
    label: 'Educación',
    accent: <Path d="M12 4.5 2.5 9.2 12 14l9.5-4.8z" />,
    stroke: <>
      <Path d="M12 4.5 2.5 9.2 12 14l9.5-4.8z" />
      <Path d="M6.5 11.3V16c0 1.6 2.5 3 5.5 3s5.5-1.4 5.5-3v-4.7" />
      <Path d="M21.5 9.2V14" />
    </>,
  },
  entretenimiento: {
    label: 'Entretenimiento',
    accent: <Path d="M10.2 8.6v5.3l4.6-2.65z" />,
    stroke: <>
      <Rect x={3} y={4.5} width={18} height={13} rx={3} />
      <Path d="M10.2 8.6v5.3l4.6-2.65z" />
      <Path d="M8.5 21h7" />
    </>,
  },
  ropa: {
    label: 'Ropa',
    accent: <Path d="M8.5 3.5 4 6l1.6 4.2 2.2-1.1V20.5h8.4V9.1l2.2 1.1L20 6l-4.5-2.5a3.6 3.6 0 0 1-7 0z" />,
    stroke: <Path d="M8.5 3.5 4 6l1.6 4.2 2.2-1.1V20.5h8.4V9.1l2.2 1.1L20 6l-4.5-2.5a3.6 3.6 0 0 1-7 0z" />,
  },
  viajes: {
    label: 'Viajes',
    accent: <Rect x={4} y={11} width={16} height={3.5} />,
    stroke: <>
      <Rect x={4} y={7} width={16} height={13} rx={2.5} />
      <Path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <Path d="M8 20v1.5M16 20v1.5" />
    </>,
  },
  mascotas: {
    label: 'Mascotas',
    accent: <Path d="M12 12.5c-2.9 0-5.2 2.3-5.2 4.5 0 1.5 1.3 2.4 2.7 2.4 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.4 0 2.7-.9 2.7-2.4 0-2.2-2.3-4.5-5.2-4.5z" />,
    stroke: <>
      <Path d="M12 12.5c-2.9 0-5.2 2.3-5.2 4.5 0 1.5 1.3 2.4 2.7 2.4 1 0 1.6-.5 2.5-.5s1.5.5 2.5.5c1.4 0 2.7-.9 2.7-2.4 0-2.2-2.3-4.5-5.2-4.5z" />
      <Circle cx={5.6} cy={10.2} r={1.7} />
      <Circle cx={9.3} cy={6.4} r={1.8} />
      <Circle cx={14.7} cy={6.4} r={1.8} />
      <Circle cx={18.4} cy={10.2} r={1.7} />
    </>,
  },
  regalos: {
    label: 'Regalos',
    accent: <Rect x={3.5} y={8} width={17} height={4} rx={1} />,
    stroke: <>
      <Rect x={3.5} y={8} width={17} height={4} rx={1} />
      <Path d="M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12" />
      <Path d="M12 8v12.5" />
      <Path d="M12 8C10.6 5 7.2 4.4 7.2 6.4 7.2 7.6 9.4 8 12 8zm0 0c1.4-3 4.8-3.6 4.8-1.6 0 1.2-2.2 1.6-4.8 1.6z" />
    </>,
  },
  suscripciones: {
    label: 'Suscripciones',
    accent: <Circle cx={12} cy={12} r={3.6} />,
    stroke: <>
      <Path d="M19.5 10.5A7.8 7.8 0 0 0 5.6 7.5L4.5 9" />
      <Path d="M4.5 4.8V9h4.2" />
      <Path d="M4.5 13.5a7.8 7.8 0 0 0 13.9 3l1.1-1.5" />
      <Path d="M19.5 19.2V15h-4.2" />
      <Circle cx={12} cy={12} r={3.6} />
    </>,
  },
  salario: {
    label: 'Salario',
    accent: <Circle cx={12} cy={12} r={3} />,
    stroke: <>
      <Rect x={2.5} y={6} width={19} height={12} rx={2.5} />
      <Circle cx={12} cy={12} r={3} />
      {dot(6, 9.5, 0.9)}
      {dot(18, 14.5, 0.9)}
    </>,
  },
  freelance: {
    label: 'Freelance',
    accent: <Rect x={7.5} y={7.5} width={9} height={5.5} rx={1} />,
    stroke: <>
      <Path d="M5 15.5V6a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v9.5" />
      <Path d="M2.8 18.5h18.4l-1 1.5H3.8z" />
      <Rect x={7.5} y={7.5} width={9} height={5.5} rx={1} />
    </>,
  },
  inversiones: {
    label: 'Inversiones',
    accent: <Path d="M4 16.5 9 11.5l3.5 3.5L20 7.5V20H4z" />,
    stroke: <>
      <Path d="M4 16.5 9 11.5l3.5 3.5L20 7.5" />
      <Path d="M15 7.5h5v5" />
      <Path d="M4 20h16" />
    </>,
  },
  ahorro: {
    label: 'Ahorro',
    accent: <Path d="M5 11.8C5 8.7 8.1 6.2 12 6.2c1.2 0 2.3.2 3.3.6L18 5.2v3.3c.9.8 1.5 1.7 1.8 2.7H21v3.6h-1.5c-.5 1-1.2 1.8-2 2.4v2.6h-3v-1.6c-.8.2-1.6.2-2.5.2s-1.7 0-2.5-.2v1.6h-3v-2.6C5.6 16 5 14.1 5 11.8z" />,
    stroke: <>
      <Path d="M5 11.8C5 8.7 8.1 6.2 12 6.2c1.2 0 2.3.2 3.3.6L18 5.2v3.3c.9.8 1.5 1.7 1.8 2.7H21v3.6h-1.5c-.5 1-1.2 1.8-2 2.4v2.6h-3v-1.6c-.8.2-1.6.2-2.5.2s-1.7 0-2.5-.2v1.6h-3v-2.6C5.6 16 5 14.1 5 11.8z" />
      <Path d="M10 9.2h3" />
      {dot(16, 10.8, 0.85)}
    </>,
  },
  deudas: {
    label: 'Deudas',
    accent: <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />,
    stroke: <>
      <Path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <Path d="M9 8h6M9 12h6M9 16h3" />
    </>,
  },
  peso: {
    label: 'Peso',
    accent: <Circle cx={12} cy={12} r={9} />,
    stroke: <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M14.6 9.3c-.4-.9-1.4-1.5-2.6-1.5-1.5 0-2.6.8-2.6 2s1.1 1.7 2.6 2 2.6.8 2.6 2-1.1 2-2.6 2c-1.2 0-2.2-.6-2.6-1.5" />
      <Path d="M12 6.3v11.4" />
    </>,
  },
  dolar: {
    label: 'Dólar',
    accent: <Circle cx={12} cy={12} r={9} />,
    stroke: <>
      <Circle cx={12} cy={12} r={9} />
      <SvgText
        x={12}
        y={14.6}
        textAnchor="middle"
        fontSize={7.4}
        fontWeight="bold"
        fontFamily="Outfit_700Bold"
        fill="currentColor"
        stroke="none"
      >
        US$
      </SvgText>
    </>,
  },
  euro: {
    label: 'Euro',
    accent: <Circle cx={12} cy={12} r={9} />,
    stroke: <>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M15.4 8.4a4.4 4.4 0 1 0 0 7.2" />
      <Path d="M7.4 10.8h5.6M7.4 13.4h5.6" />
    </>,
  },
  banco: {
    label: 'Banco',
    accent: <Path d="M3 9.5 12 4l9 5.5z" />,
    stroke: <>
      <Path d="M3 9.5 12 4l9 5.5z" />
      <Path d="M6 12v5.5M10 12v5.5M14 12v5.5M18 12v5.5" />
      <Path d="M3.5 20.5h17" />
    </>,
  },
  billetera: {
    label: 'Billetera',
    accent: <Path d="M15.5 12h5v3.5h-5a1.75 1.75 0 0 1 0-3.5z" />,
    stroke: <>
      <Path d="M4 7a2 2 0 0 1 2-2h10.5v3.5" />
      <Path d="M4 7v11a2 2 0 0 0 2 2h13.5a1 1 0 0 0 1-1V9.5a1 1 0 0 0-1-1H6A2 2 0 0 1 4 7z" />
      <Path d="M15.5 12h5v3.5h-5a1.75 1.75 0 0 1 0-3.5z" />
    </>,
  },
  tarjeta: {
    label: 'Tarjeta',
    accent: <Rect x={2.5} y={9} width={19} height={3.2} />,
    stroke: <>
      <Rect x={2.5} y={5.5} width={19} height={13} rx={2.5} />
      <Path d="M2.5 9.5h19" />
      <Path d="M6 15h4" />
    </>,
  },
  cripto: {
    label: 'Cripto',
    accent: <Path d="M12 2.5 20.2 7.2v9.6L12 21.5l-8.2-4.7V7.2z" />,
    stroke: <>
      <Path d="M12 2.5 20.2 7.2v9.6L12 21.5l-8.2-4.7V7.2z" />
      <Path d="M10 8.2h3a1.9 1.9 0 0 1 0 3.8h-3zM10 12h3.5a1.9 1.9 0 0 1 0 3.8H10zM10 8.2v7.6" />
      <Path d="M11.2 6.8v1.4M13 6.8v1.4M11.2 15.8v1.4M13 15.8v1.4" />
    </>,
  },
  tecnologia: {
    label: 'Tecnología',
    accent: <Rect x={8.5} y={5} width={7} height={11} rx={1} />,
    stroke: <>
      <Rect x={6.5} y={2.5} width={11} height={19} rx={2.5} />
      <Path d="M11 18.8h2" />
    </>,
  },
  otros: {
    label: 'Otros',
    accent: <Circle cx={12} cy={12} r={9} />,
    stroke: <>
      <Circle cx={12} cy={12} r={9} />
      {dot(8, 12, 1.25)}
      {dot(12, 12, 1.25)}
      {dot(16, 12, 1.25)}
    </>,
  },
} satisfies Record<string, IconParts>;

export type AppIconName = keyof typeof ICON_SET;

/** Registro de los íconos propios, en el orden del selector. */
export const CATEGORY_ICONS: { name: AppIconName; label: string }[] = (Object.keys(ICON_SET) as AppIconName[]).map(
  (name) => ({ name, label: ICON_SET[name].label })
);

/** Los que tienen sentido para una cuenta (selector del formulario de cuentas). */
export const ACCOUNT_ICONS: AppIconName[] = [
  'peso', 'dolar', 'euro', 'banco', 'billetera', 'tarjeta', 'ahorro', 'inversiones', 'cripto',
];

export function isAppIcon(name: string | null | undefined): name is AppIconName {
  return !!name && Object.prototype.hasOwnProperty.call(ICON_SET, name);
}
