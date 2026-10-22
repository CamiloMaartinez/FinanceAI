// Moni como texto SVG estático, para lugares donde no hay React Native:
// el informe PDF (HTML de expo-print). Usa la misma geometría de poses.ts y
// los mismos trazos que Mascot.tsx, pero sin animación. Si cambias el dibujo
// de Moni en Mascot.tsx, cambia también este archivo.

import { MASCOT_COLORS as M, POSES, type Eyes, type Limb, type MascotPose, type Mouth } from './poses';

const STROKE = 4.5;

function coin(): string {
  return `
    <ellipse cx="106" cy="90" rx="46" ry="48.5" fill="${M.coinEdge}"/>
    <circle cx="100" cy="90" r="48" fill="${M.coinFace}"/>
    <circle cx="100" cy="90" r="37" stroke="${M.coinRing}" stroke-width="3" fill="none"/>
    <path d="M64 74 Q71 57 89 50" stroke="${M.coinShine}" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8"/>
    <ellipse cx="79" cy="101" rx="7" ry="4" fill="${M.cheek}" opacity="0.6"/>
    <ellipse cx="121" cy="101" rx="7" ry="4" fill="${M.cheek}" opacity="0.6"/>`;
}

function eyes(kind: Eyes): string {
  const line = `stroke="${M.ink}" stroke-width="3.2" stroke-linecap="round" fill="none"`;
  switch (kind) {
    case 'happy':
      return `<path d="M80 91 Q86 82 92 91" ${line}/><path d="M108 91 Q114 82 120 91" ${line}/>`;
    case 'closed':
      return `<path d="M80 87 Q86 94 92 87" ${line}/><path d="M108 87 Q114 94 120 87" ${line}/>`;
    case 'wink':
      return `<path d="M80 84 L91 88 L80 92" ${line} stroke-linejoin="round"/>
        <ellipse cx="118" cy="87" rx="5.2" ry="6.6" fill="${M.ink}"/><circle cx="120" cy="84.5" r="1.6" fill="#FFFFFF"/>`;
    case 'determined':
      return `<path d="M79 78 L92 83" ${line}/><path d="M121 78 L108 83" ${line}/>
        <ellipse cx="86" cy="89" rx="3.6" ry="4.6" fill="${M.ink}"/><ellipse cx="114" cy="89" rx="3.6" ry="4.6" fill="${M.ink}"/>`;
    default:
      return `<ellipse cx="86" cy="88" rx="3.6" ry="4.8" fill="${M.ink}"/><ellipse cx="114" cy="88" rx="3.6" ry="4.8" fill="${M.ink}"/>
        <circle cx="87.2" cy="86.2" r="1.1" fill="#FFFFFF"/><circle cx="115.2" cy="86.2" r="1.1" fill="#FFFFFF"/>`;
  }
}

function mouth(kind: Mouth): string {
  switch (kind) {
    case 'open':
      return `<path d="M88 102 Q100 121 112 102 Z" fill="${M.ink}" stroke-linejoin="round"/>
        <ellipse cx="100" cy="111" rx="5.5" ry="3" fill="${M.cheek}"/>`;
    case 'o':
      return `<ellipse cx="100" cy="106" rx="3.8" ry="4.8" fill="${M.ink}"/>`;
    case 'small':
      return `<path d="M95 106 Q100 109.5 105 106" stroke="${M.ink}" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
    default:
      return `<path d="M89 103 Q100 113 111 103" stroke="${M.ink}" stroke-width="3.2" stroke-linecap="round" fill="none"/>`;
  }
}

function limb(l: Limb, color: string): string {
  const { end, tip } = l;
  const s = `stroke="${color}" stroke-linecap="round" fill="none"`;
  let out = `<path d="${l.d}" stroke-width="${STROKE}" ${s}/>`;
  out += end.kind === 'foot'
    ? `<ellipse cx="${end.x}" cy="${end.y}" rx="8" ry="4.2" stroke-width="3.4" ${s}/>`
    : `<circle cx="${end.x}" cy="${end.y}" r="${end.kind === 'point' ? 4.5 : 5.5}" fill="${color}"/>`;
  if (end.kind === 'thumb') out += `<path d="M${end.x} ${end.y - 3} L${end.x - 1} ${end.y - 12}" stroke-width="4" ${s}/>`;
  if (end.kind === 'open') {
    out += `<path d="M${end.x} ${end.y} L${end.x - 6} ${end.y - 6} M${end.x} ${end.y} L${end.x} ${end.y - 9} M${end.x} ${end.y} L${end.x + 6} ${end.y - 6}" stroke-width="3" ${s}/>`;
  }
  if (end.kind === 'point' && tip) out += `<path d="M${end.x} ${end.y} L${tip.x} ${tip.y}" stroke-width="3.4" ${s}/>`;
  return out;
}

function chart(ink: string): string {
  const grid = [46, 62, 78, 94].map((y) => `M132 ${y} L192 ${y}`).join(' ') + ' ' +
    [148, 164, 180].map((x) => `M${x} 34 L${x} 104`).join(' ');
  return `<path d="${grid}" stroke="${M.sparkleLavender}" stroke-width="1.5" opacity="0.6"/>
    <path d="M132 32 L132 104 L194 104" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M136 96 Q148 66 160 82 Q170 94 184 50" stroke="${ink}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M176 52 L185 47 L186 57" stroke="${ink}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <path d="M190 30 L192 36 L198 38 L192 40 L190 46 L188 40 L182 38 L188 36 Z" fill="${M.sparklePeach}"/>`;
}

function magnifier(): string {
  return `<path d="M135 99 L148 114" stroke="${M.ink}" stroke-width="5.5" stroke-linecap="round"/>
    <circle cx="124" cy="88" r="14" fill="${M.lens}" fill-opacity="0.5" stroke="${M.ink}" stroke-width="3.5"/>
    <path d="M116 82 Q119 77 125 76" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
}

function shield(): string {
  return `<path d="M28 106 L54 106 L54 123 Q54 138 41 145 Q28 138 28 123 Z" fill="${M.shield}" stroke="${M.ink}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M41 114 L43.4 119.4 L49 119.8 L44.7 123.4 L46 129 L41 126 L36 129 L37.3 123.4 L33 119.8 L38.6 119.4 Z" fill="${M.ink}"/>`;
}

const CONFETTI = [
  [24, 18, M.sparkleLavender, 20], [46, 40, M.sparklePeach, -30], [68, 10, M.coinFace, 45],
  [132, 30, M.sparklePeach, 10], [154, 8, M.sparkleLavender, -45], [176, 36, M.coinEdge, 30],
] as const;

interface MascotSvgOptions {
  size?: number;
  /** `light` para fondos oscuros (brazos claros), `dark` para fondos claros. */
  tone?: 'light' | 'dark';
}

/** SVG de Moni en una pose, listo para incrustar en HTML. */
export function mascotSvg(pose: MascotPose, { size = 120, tone = 'dark' }: MascotSvgOptions = {}): string {
  const spec = POSES[pose];
  const color = tone === 'light' ? M.inkLight : M.ink;
  const has = (a: (typeof spec.accessories)[number]) => spec.accessories.includes(a);

  const back = [
    spec.shadow ? `<ellipse cx="${100 + spec.offsetX}" cy="182" rx="34" ry="6" fill="${M.lens}" opacity="0.5"/>` : '',
    has('bar') ? `<line x1="20" y1="25" x2="180" y2="25" stroke="${M.sparkleLavender}" stroke-width="4" stroke-linecap="round"/>` : '',
    has('chart') ? chart(color) : '',
    has('confetti')
      ? CONFETTI.map(([x, y, fill, rot]) =>
          `<rect x="${x}" y="${y}" width="6" height="10" rx="1.5" fill="${fill}" transform="rotate(${rot} ${x + 3} ${y + 5})"/>`).join('')
      : '',
  ].join('');

  const body = `
    <g transform="translate(${spec.offsetX} 0)">
      ${limb(spec.legs.left, color)}${limb(spec.legs.right, color)}
      <g transform="rotate(${spec.tilt} 100 128)">
        ${coin()}${eyes(spec.eyes)}${mouth(spec.mouth)}
        ${limb(spec.arms.left, color)}${has('shield') ? shield() : ''}
        ${has('magnifier') ? magnifier() : ''}${limb(spec.arms.right, color)}
      </g>
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="Moni ${spec.label}">${back}${body}</svg>`;
}
