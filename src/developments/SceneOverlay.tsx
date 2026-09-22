import { useId } from 'react';
import type { Lighting, TowerId } from './moradas';

// Pixel coordinates measured on hero.webp (1672 × 941). Image, lights and
// selection share one cover projection and one zoom transform at every size.
const facades = {
  a: { x: [807, 1012, 1150], roof: [222, 222, 216], base: [670, 706, 636] },
  b: { x: [481, 615, 764], roof: [219, 219, 216], base: [566, 590, 537] },
};
export function floorOutline(tower: TowerId, floor: number) {
  const facade = facades[tower];
  const boundary = (level: number) => facade.x.map((x, i) => [x, facade.base[i] + (facade.roof[i] - facade.base[i]) * level / 9]);
  const upper = boundary(floor), lower = boundary(floor - 1).reverse();
  return [...upper, ...lower].map(point => point.map(value => Number(value.toFixed(2))).join(',')).join(' ');
}

// Glazing coordinates follow the source render rather than a regular screen grid.
const windows = [
  { x: 830, y: 231, w: 19, h: 16, step: 50.3, slope: .05 },
  { x: 900, y: 235, w: 12, h: 13, step: 51.2, slope: .1 },
  { x: 963, y: 232, w: 20, h: 16, step: 53.1, slope: .11 },
  { x: 1058, y: 237, w: 15, h: 12, step: 52.4, slope: -.18 },
  { x: 1127, y: 226, w: 4, h: 13, step: 47.2, slope: -.25 },
  { x: 497, y: 227, w: 11, h: 13, step: 39.8, slope: .05 },
  { x: 548, y: 231, w: 6, h: 10, step: 39.9, slope: .1 },
  { x: 583, y: 227, w: 12, h: 13, step: 40.8, slope: .12 },
  { x: 663, y: 231, w: 14, h: 11, step: 40.3, slope: -.19 },
  { x: 734, y: 228, w: 4, h: 10, step: 38.2, slope: -.24 },
].flatMap((column, c) => Array.from({ length: 9 }, (_, row) => ({ ...column, y: column.y + column.step * row, lit: (row * 3 + c * 2) % 7 !== 0 && (row + c) % 5 !== 0 })));

const grounds = [
  [224, 636], [336, 695], [527, 784], [660, 827], [738, 861],
  [797, 696], [888, 691], [1019, 713], [1100, 662], [543, 605], [629, 611],
  [1237, 714], [1277, 720], [1337, 700], [1416, 722], [1490, 747], [1540, 760],
];
export default function SceneOverlay({ tower, floor, lighting, showFloor }: { tower: TowerId; floor: number; lighting: Lighting; showFloor: boolean }) {
  const uid = useId().replace(/:/g, '');
  const glow = `${uid}-glow`, pane = `${uid}-pane`;
  return <svg className="development-scene-overlay" viewBox="0 0 1672 941" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <radialGradient id={glow}><stop stopColor="#ffe3a7" stopOpacity=".7" /><stop offset=".35" stopColor="#ffc875" stopOpacity=".24" /><stop offset="1" stopColor="#ffbd64" stopOpacity="0" /></radialGradient>
      <linearGradient id={pane} x2="0" y2="1"><stop stopColor="#fff2c8" /><stop offset="1" stopColor="#e9a957" /></linearGradient>
    </defs>
    <g className="development-scene-lights" data-lighting={lighting} data-testid="scene-lights">
      <g data-testid="apartment-lights">
        {windows.filter(window => window.lit).map((window, i) => {
          const { x, y, w, h, slope } = window;
          return <g key={i} opacity={.65 + (i % 3) * .12}>
            <ellipse cx={x + w / 2} cy={y + h / 2} rx={w * 1.6} ry={h * 1.5} fill={`url(#${glow})`} />
            <path d={`M${x},${y} l${w},${w * slope} v${h} l${-w},${-w * slope} Z`} fill={`url(#${pane})`} />
            <path d={`M${x + w / 2},${y + w * slope / 2} v${h}`} stroke="#8e795d" strokeWidth="1.1" opacity=".7" />
          </g>;
        })}
      </g>
      <g data-testid="condominium-lights">
        {/* Warm light in the entrance halls and leisure pavilion glazing. */}
        {['891,686 916,693 916,719 891,711', '1246,699 1283,711 1283,738 1246,725', '1374,700 1430,716 1430,743 1374,725', '1451,725 1523,746 1523,775 1451,751'].map(points => <polygon key={points} points={points} fill={`url(#${pane})`} opacity=".42" />)}
        {grounds.map(([x, y], i) => <g key={i}>
          <ellipse cx={x} cy={y + 9} rx="22" ry="28" fill={`url(#${glow})`} />
          <ellipse cx={x} cy={y + 21} rx="24" ry="7" fill={`url(#${glow})`} />
          <circle cx={x} cy={y} r="1.5" fill="#fff4cc" />
        </g>)}
        <path d="M1278 779 L1335 758 L1477 799 L1437 814 Z" fill="#8be0e4" opacity=".18" />
        <path d="M1282 779 L1335 761 L1469 799" fill="none" stroke="#c1f6f1" strokeWidth="1.5" opacity=".55" />
      </g>
    </g>
    {showFloor && <polygon className="development-floor-band" data-testid="floor-band" data-selected-floor={`${tower}-${floor}`} points={floorOutline(tower, floor)} />}
  </svg>;
}
