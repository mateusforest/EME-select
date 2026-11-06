// Source-space calibration for hero.webp (1672 x 941). Keep the Select copy in sync.
// Image and SVG must both use centered cover/slice, including on narrow screens.
export const facadeCalibration = {
  a: { levels: 8, x: [481, 615, 764], roof: [220, 220, 216], base: [546, 568, 520] },
  b: { levels: 9, x: [807, 1012, 1150], roof: [222, 222, 216], base: [670, 706, 636] },
} as const;
export function floorOutline(tower: 'a'|'b', floor: number) {
  const facade = facadeCalibration[tower];
  const boundary = (level: number) => facade.x.map((x, i) => [x, facade.base[i] + (facade.roof[i] - facade.base[i]) * level / facade.levels]);
  return [...boundary(floor), ...boundary(floor - 1).reverse()].map(point => point.map(value => Number(value.toFixed(2))).join(',')).join(' ');
}
export const floorColors = {available: '#39cd87', negotiation: '#ff983e', sold: '#f46068'} as const;
