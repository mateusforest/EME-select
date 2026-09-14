import { CanvasTexture, Color, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from 'three';

export function seededRandom(seed: number) {
  return () => { seed = (Math.imul(1664525, seed) + 1013904223) | 0; return (seed >>> 0) / 4294967296; };
}

/** Small local procedural material maps. No image planes or downloaded assets. */
function surface(kind: 'stone' | 'wood' | 'sand') {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const random = seededRandom(kind === 'wood' ? 72 : 31);
  ctx.fillStyle = kind === 'wood' ? '#b6a080' : kind === 'sand' ? '#e9e1cc' : '#e9e3d7';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) {
    const p = random();
    ctx.fillStyle = `rgba(${kind === 'wood' ? '60,42,25' : '102,91,68'},${0.018 + p * 0.11})`;
    const x = random() * 256; const y = random() * 256;
    ctx.fillRect(x, y, kind === 'wood' ? 0.3 + random() * 0.8 : 0.4 + p * 1.5, kind === 'wood' ? 7 + random() * 60 : 0.4 + p * 1.5);
  }
  if (kind === 'stone') {
    for (let i = 0; i < 45; i++) {
      const y = random() * 256;
      ctx.strokeStyle = `rgba(143,128,99,${0.03 + random() * 0.08})`; ctx.lineWidth = 0.4;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(80, y + random() * 10, 160, y - random() * 8, 256, y + random() * 3); ctx.stroke();
    }
  }
  const texture = new CanvasTexture(canvas); texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace; texture.anisotropy = 4; texture.repeat.set(kind === 'wood' ? 2 : 3, 3);
  return texture;
}

export function architecturalMaterials() {
  const stoneMap = surface('stone'); const woodMap = surface('wood'); const sandMap = surface('sand');
  const matte = (color: string, roughness = 0.8) => new MeshStandardMaterial({ color, roughness });
  return {
    stone: new MeshStandardMaterial({ color: '#e0d7c4', map: stoneMap, roughness: 0.88 }),
    plaster: matte('#efe9dd'),
    concrete: matte('#c6c2b6'),
    warmStone: new MeshStandardMaterial({ color: '#c6b49a', map: stoneMap, roughness: 0.92 }),
    wood: new MeshStandardMaterial({ color: '#a88860', map: woodMap, roughness: 0.66 }),
    darkWood: new MeshStandardMaterial({ color: '#766046', map: woodMap, roughness: 0.7 }),
    frame: new MeshStandardMaterial({ color: '#373c36', metalness: 0.48, roughness: 0.36 }),
    roof: new MeshStandardMaterial({ color: '#555a50', metalness: 0.3, roughness: 0.48 }),
    glass: new MeshPhysicalMaterial({ color: '#a9c4c0', metalness: 0.13, roughness: 0.13, transparent: true, opacity: 0.39, depthWrite: false }),
    window: new MeshStandardMaterial({ color: '#788c85', metalness: 0.33, roughness: 0.22 }),
    darkInterior: matte('#7d7463'),
    linen: matte('#f5efe0', 0.98),
    cushion: matte('#c8bc9f', 0.99),
    leaf: matte('#68765a', 0.92),
    leafLight: matte('#899371', 0.92),
    leafDark: matte('#435d49', 0.91),
    trunk: matte('#8a7960'),
    grass: matte('#a4ad82', 0.97),
    grassDark: matte('#859474', 0.96),
    sand: new MeshStandardMaterial({ color: '#e4dac4', map: sandMap, roughness: 1 }),
    earth: matte('#c3b9a3', 1),
    paving: matte('#e4ddce'),
    asphalt: matte('#a4aaa4'),
    water: new MeshPhysicalMaterial({ color: '#8cbeb8', roughness: 0.17, metalness: 0.17, clearcoat: 1, clearcoatRoughness: 0.1 }),
    sea: new MeshPhysicalMaterial({ color: '#a9cac5', roughness: 0.28, metalness: 0.12, clearcoat: 0.65 }),
    poolTile: matte('#7aada7', 0.45),
    brass: new MeshStandardMaterial({ color: '#9c8b60', metalness: 0.68, roughness: 0.36 }),
    light: new MeshStandardMaterial({ color: '#fff0cc', emissive: new Color('#ebc590'), emissiveIntensity: 0.5, roughness: 0.7 }),
  };
}

export type ArchitecturalMaterials = ReturnType<typeof architecturalMaterials>;
export type MaterialName = keyof ArchitecturalMaterials;
