import {
  BoxGeometry, CanvasTexture, Color, CylinderGeometry, DoubleSide, Group,
  Mesh, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry,
  RepeatWrapping, SphereGeometry, SRGBColorSpace, TorusGeometry, Vector3,
} from 'three';
import type { BufferGeometry, Material, Texture } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { SpatialScene } from './types';

/** Authored architectural concept, in metres. No photographic plane is used. */
export function buildInteriorScene(): SpatialScene {
  const draft = new Group();
  const textures: Texture[] = [];
  const materials: Material[] = [];
  let randomSeed = 261106;
  const random = () => {
    randomSeed = (randomSeed * 1664525 + 1013904223) >>> 0;
    return randomSeed / 4294967296;
  };

  function surface(kind: 'wood' | 'stone' | 'linen' | 'rug'): CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const bases = { wood: '#b5a087', stone: '#e2d7c4', linen: '#e8dfcf', rug: '#b8a78a' };
    ctx.fillStyle = bases[kind]; ctx.fillRect(0, 0, 512, 512);
    if (kind === 'wood') {
      for (let i = 0; i < 740; i++) {
        const x = random() * 512;
        ctx.strokeStyle = `rgba(${random() > .5 ? '58,31,12' : '236,213,163'},${.015 + random() * .1})`;
        ctx.lineWidth = .2 + random() * 2.5;
        ctx.beginPath(); ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + random() * 8 - 4, 140, x + random() * 8 - 4, 370, x, 512);
        ctx.stroke();
      }
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(55,29,11,.07)'; ctx.fillRect(i * 64, 0, 1, 512);
      }
    } else if (kind === 'stone') {
      for (let i = 0; i < 7500; i++) {
        ctx.fillStyle = `rgba(${random() > .44 ? '127,108,80' : '255,253,244'},${.025 + random() * .09})`;
        ctx.fillRect(random() * 512, random() * 512, .3 + random() * 2.2, .2 + random() * 1.1);
      }
      for (let i = 0; i < 18; i++) {
        const y = random() * 512;
        ctx.strokeStyle = 'rgba(138,117,88,.065)'; ctx.lineWidth = .2 + random() * 1.3;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(110, y + 9, 350, y - 14, 512, y); ctx.stroke();
      }
    } else {
      const pitch = kind === 'rug' ? 8 : 4;
      for (let i = 0; i < 512; i += pitch) {
        ctx.fillStyle = 'rgba(81,62,41,.09)'; ctx.fillRect(i, 0, 1.5, 512); ctx.fillRect(0, i, 512, 1.5);
        ctx.fillStyle = 'rgba(255,255,241,.16)'; ctx.fillRect(i + 2, 0, 1, 512); ctx.fillRect(0, i + 2, 512, 1);
      }
      for (let i = 0; i < 7000; i++) {
        ctx.fillStyle = `rgba(74,62,43,${random() * .055})`;
        ctx.fillRect(random() * 512, random() * 512, 1, 2);
      }
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.anisotropy = 4;
    textures.push(texture);
    return texture;
  }

  const woodMap = surface('wood');
  const stoneMap = surface('stone');
  const linenMap = surface('linen'); linenMap.repeat.set(3, 3);
  const rugMap = surface('rug'); rugMap.repeat.set(3, 3);
  const material = (parameters: ConstructorParameters<typeof MeshStandardMaterial>[0]) => {
    const result = new MeshStandardMaterial(parameters); materials.push(result); return result;
  };
  const plaster = material({ color: '#f2eee4', roughness: .88 });
  const stone = material({ color: '#f5efdf', map: stoneMap, bumpMap: stoneMap, bumpScale: .009, roughness: .55 });
  const timber = material({ color: '#9e8168', map: woodMap, bumpMap: woodMap, bumpScale: .01, roughness: .59 });
  const walnut = material({ color: '#79624b', map: woodMap, bumpMap: woodMap, bumpScale: .007, roughness: .54 });
  const fabric = material({ color: '#fff8e9', map: linenMap, bumpMap: linenMap, bumpScale: .028, roughness: .95 });
  const oliveFabric = material({ color: '#76745b', map: linenMap, bumpMap: linenMap, bumpScale: .02, roughness: 1 });
  const sandFabric = material({ color: '#c7b393', map: linenMap, bumpMap: linenMap, bumpScale: .025, roughness: 1 });
  const rug = material({ color: '#d1c3aa', map: rugMap, bumpMap: rugMap, bumpScale: .022, roughness: 1 });
  const bronze = material({ color: '#65584a', metalness: .65, roughness: .38 });
  const charcoal = material({ color: '#34332d', roughness: .58 });
  const leather = material({ color: '#83644c', roughness: .65 });
  const ceramic = material({ color: '#d5c7ae', map: stoneMap, roughness: .7 });
  const leaf = material({ color: '#536748', roughness: .78 });
  const leafLight = material({ color: '#7c8953', roughness: .84 });
  const earth = material({ color: '#64513c', roughness: 1 });
  const line = material({ color: '#c0b6a4', roughness: 1 });
  const glow = material({ color: '#fff5d5', emissive: '#ffe2ab', emissiveIntensity: 1.3, roughness: .45 });
  const glass = new MeshPhysicalMaterial({ color: '#c6ddd5', metalness: .05, roughness: .07, transparent: true, opacity: .12, depthWrite: false, side: DoubleSide });
  materials.push(glass);
  const contactCanvas = document.createElement('canvas');
  contactCanvas.width = contactCanvas.height = 128;
  const contactContext = contactCanvas.getContext('2d')!;
  const contactGradient = contactContext.createRadialGradient(64, 64, 8, 64, 64, 63);
  contactGradient.addColorStop(0, 'rgba(47,37,25,.48)');
  contactGradient.addColorStop(.45, 'rgba(47,37,25,.3)');
  contactGradient.addColorStop(1, 'rgba(47,37,25,0)');
  contactContext.fillStyle = contactGradient; contactContext.fillRect(0, 0, 128, 128);
  const contactTexture = new CanvasTexture(contactCanvas); contactTexture.colorSpace = SRGBColorSpace; textures.push(contactTexture);
  const contactMaterial = new MeshBasicMaterial({ map: contactTexture, transparent: true, depthWrite: false, opacity: .66, toneMapped: false });
  materials.push(contactMaterial);

  function add(geometry: BufferGeometry, mat: Material, position: [number, number, number], parent = draft): Mesh {
    const mesh = new Mesh(geometry, mat); mesh.position.set(...position);
    mesh.castShadow = mat !== glass && mat !== glow;
    mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function box(w: number, h: number, d: number, mat: Material, x: number, y: number, z: number, parent = draft, radius = 0): Mesh {
    return add(radius > 0 ? new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)) : new BoxGeometry(w, h, d), mat, [x, y, z], parent);
  }
  function cylinder(top: number, bottom: number, height: number, mat: Material, x: number, y: number, z: number, parent = draft): Mesh {
    return add(new CylinderGeometry(top, bottom, height, 28), mat, [x, y, z], parent);
  }
  function sphere(sx: number, sy: number, sz: number, mat: Material, x: number, y: number, z: number, parent = draft, detail = 12): Mesh {
    const object = add(new SphereGeometry(1, detail, Math.max(6, detail / 2)), mat, [x, y, z], parent);
    object.scale.set(sx, sy, sz); return object;
  }
  function beam(from: [number, number, number], to: [number, number, number], radius: number, mat: Material, parent = draft) {
    const a = new Vector3(...from), b = new Vector3(...to), delta = b.clone().sub(a);
    const mesh = cylinder(radius, radius, delta.length(), mat, ...a.add(b).multiplyScalar(.5).toArray() as [number, number, number], parent);
    mesh.quaternion.setFromUnitVectors(new Vector3(0, 1, 0), delta.normalize()); return mesh;
  }
  function contact(x: number, z: number, width: number, depth: number, y = .024) {
    const plane = add(new PlaneGeometry(width, depth), contactMaterial, [x, y, z]);
    plane.rotation.x = -Math.PI / 2; plane.castShadow = false; plane.receiveShadow = false;
  }

  // Travertine slab grid, full room envelope and the deep outdoor terrace.
  box(12.4, .24, 14.4, stone, 0, -.15, -2);
  const slabMaterials = ['#eee5d7', '#e6ddce', '#eae2d6', '#ded4c4', '#e3d9c9'].map((color, index) =>
    material({ color, map: stoneMap, bumpMap: stoneMap, bumpScale: .012, roughness: .39 + index * .025 }));
  for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 9; iz++) {
    const slab = box(1.487, .009, 1.487, slabMaterials[(ix * 3 + iz * 7) % slabMaterials.length], -5.25 + ix * 1.5, -.025, -8.25 + iz * 1.5);
    slab.rotation.y = ((ix + iz) % 4) * Math.PI / 2;
  }
  for (let x = -6; x <= 6; x += 1.5) box(.008, .003, 14, line, x, -.026, -2);
  for (let z = -9; z <= 5; z += 1.5) box(12, .003, .008, line, 0, -.025, z);
  box(.22, 3.3, 10.2, timber, -6.12, 1.6, 0);
  box(.22, 3.3, 10.2, plaster, 6.12, 1.6, 0);
  box(12.3, 3.3, .2, plaster, 0, 1.6, 5.1);
  box(4.7, 3.3, .24, timber, -3.75, 1.6, -5.05);
  const ceiling = box(12.4, .16, 10.3, plaster, 0, 3.29, .05); ceiling.castShadow = false;
  const livingSoffit = box(7.04, .05, 9.8, walnut, 2.45, 3.2, .01); livingSoffit.castShadow = false;
  for (let x = -1.01; x <= 5.95; x += .13) {
    const slat = box(.094, .042, 9.77, timber, x, 3.159, .01); slat.castShadow = false;
  }
  const terraceCeiling = box(12.4, .14, 4.1, timber, 0, 3.24, -7.02); terraceCeiling.castShadow = false;
  for (let x = -5.9; x <= 5.9; x += .16) {
    const slat = box(.045, .055, 3.96, timber, x, 3.14, -7.02); slat.castShadow = false;
  }
  for (const x of [-1.28, 5.83]) box(.27, 3.2, .48, stone, x, 1.56, -4.8);
  box(7.3, .16, .36, bronze, 2.27, 3.07, -4.83);
  for (const z of [-4.88, -4.76]) box(7.3, .018, .024, bronze, 2.27, .008, z);
  // Glass stacks at the jambs leave a genuinely open threshold in the centre.
  for (const x of [-.98, 5.5]) {
    box(1.06, 2.93, .021, glass, x, 1.48, -4.81);
    for (const edge of [-.53, .53]) box(.024, 2.96, .042, bronze, x + edge, 1.48, -4.8);
  }
  box(11.96, 1.04, .025, glass, 0, .63, -8.93);
  box(12.08, .034, .054, bronze, 0, 1.18, -8.93);
  for (const x of [-5.95, -3, 0, 3, 5.95]) box(.026, 1.12, .03, bronze, x, .61, -8.93);

  // Ceiling downlights and a very quiet indirect joinery light.
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    for (const z of [-2.8, 1.8, -6.5]) {
      cylinder(.066, .066, .02, bronze, x, 3.12, z);
      cylinder(.043, .043, .025, glow, x, 3.1, z);
    }
  }
  box(4.3, .016, .016, glow, -3.72, 2.59, -4.87);

  // Upholstered modular sofa: individually modelled seats, backs, piping and legs.
  function sofa(x: number, z: number, width: number, angle: number, outside = false) {
    const object = new Group(); object.position.set(x, 0, z); object.rotation.y = angle; draft.add(object);
    const base = outside ? sandFabric : fabric;
    box(width, .36, 1.04, base, 0, .35, 0, object, .14);
    box(width - .12, .51, .26, base, 0, .73, .41, object, .095);
    for (const end of [-1, 1]) box(.27, .53, 1.08, base, end * (width / 2 - .135), .51, 0, object, .1);
    const seatCount = width > 3 ? 3 : 2;
    const usable = width - .64;
    for (let i = 0; i < seatCount; i++) {
      const sx = -usable / 2 + usable / seatCount * (i + .5);
      box(usable / seatCount - .025, .23, .79, base, sx, .6, -.07, object, .085);
      const cushion = box(usable / seatCount - .03, .5, .19, base, sx, .86, .24, object, .072); cushion.rotation.x = -.13;
    }
    const cushion = box(.49, .47, .18, oliveFabric, -width * .2, .88, .01, object, .078); cushion.rotation.set(-.18, -.14, .1);
    const cushion2 = box(.44, .44, .17, sandFabric, width * .23, .85, -.005, object, .072); cushion2.rotation.set(-.14, .12, -.13);
    for (const sx of [-width / 2 + .25, width / 2 - .25]) for (const sz of [-.3, .3]) cylinder(.03, .023, .18, walnut, sx, .1, sz, object);
    return object;
  }
  sofa(-4.53, 1.12, 3.7, -Math.PI / 2);
  box(5.75, .026, 4.75, rug, -1.5, .002, 1.25, draft, .012);
  contact(-4.48, 1.12, 2.7, 4.45); contact(-1.92, 1.03, 3.05, 2.13);
  // Low Brazilian timber table, structural slab supports and editorial objects.
  box(2.35, .15, 1.48, walnut, -1.92, .44, 1.03, draft, .025);
  for (const x of [-2.77, -1.07]) box(.12, .35, 1.14, walnut, x, .19, 1.03);
  box(1.96, .07, .94, walnut, -1.92, .16, 1.03);
  box(.55, .045, .39, plaster, -1.33, .541, 1.03, draft, .005).rotation.y = -.13;
  box(.51, .035, .36, oliveFabric, -1.32, .582, 1.03, draft, .004).rotation.y = -.06;
  cylinder(.15, .12, .06, walnut, -2.28, .565, 1.35);
  cylinder(.09, .16, .26, ceramic, -2.41, .655, .71);
  cylinder(.052, .071, .09, ceramic, -2.41, .82, .71);
  for (let i = 0; i < 7; i++) {
    const angle = i * 2.4; const px = -2.41 + Math.cos(angle) * .17, pz = .71 + Math.sin(angle) * .13;
    beam([-2.41, .81, .71], [px, 1.04 + random() * .14, pz], .006, leaf);
    sphere(.067, .018, .037, leafLight, px, 1.04, pz, draft, 8).rotation.z = angle;
  }

  // Sculptural leather armchair with independently articulated timber frame.
  function armchair(x: number, z: number, angle: number) {
    const g = new Group(); g.position.set(x, 0, z); g.rotation.y = angle; draft.add(g);
    box(.8, .14, .76, leather, 0, .48, 0, g, .055).rotation.x = -.06;
    box(.8, .64, .12, leather, 0, .84, .33, g, .065).rotation.x = -.21;
    for (const side of [-.47, .47]) {
      beam([side, .05, -.4], [side, .71, -.25], .035, walnut, g);
      beam([side, .05, .46], [side, 1.06, .42], .035, walnut, g);
      beam([side, .72, -.44], [side, .76, .51], .034, walnut, g);
    }
    beam([-.46, .31, .41], [.46, .31, .41], .028, walnut, g);
    return g;
  }
  armchair(2.38, 1.17, -.53);
  contact(2.38, 1.17, 1.7, 1.8);
  cylinder(.37, .31, .55, stone, 3.3, .265, 1.01);
  cylinder(.42, .42, .065, stone, 3.3, .56, 1.01);
  box(.29, .045, .24, plaster, 3.23, .615, .98, draft, .004);
  cylinder(.072, .075, .13, ceramic, 3.39, .65, .99);
  contact(3.3, 1.01, 1.25, 1.25);

  // Joinery wall, discreet shelving and an original geometric art composition.
  box(.29, .08, 4.4, walnut, -5.78, .91, 1.6);
  for (let i = 0; i < 4; i++) box(.22, .035, .44 - i * .03, i % 2 ? oliveFabric : plaster, -5.73, .975 + i * .038, -.03);
  cylinder(.1, .16, .4, ceramic, -5.73, 1.13, 2.4);
  box(.055, 1.53, 1.08, walnut, -5.93, 2.02, 1.16);
  box(.012, 1.42, .97, plaster, -5.891, 2.02, 1.16);
  sphere(.013, .38, .26, sandFabric, -5.878, 2.18, 1.11, draft, 20);
  box(.017, .42, .33, oliveFabric, -5.867, 1.81, 1.26, draft, .013);
  box(.02, .6, .045, walnut, -5.863, 2.08, .91);

  // Kitchen: appliance column, flush drawers, solid stone island, tap and stools.
  for (let i = 0; i < 5; i++) {
    const x = -5.49 + i * .8;
    box(.78, .84, .66, timber, x, .44, -4.54);
    box(.8, .05, .72, stone, x, .89, -4.52);
    box(.71, .016, .02, bronze, x, .73, -4.192);
    box(.78, .77, .38, timber, x, 2.23, -4.68);
  }
  box(.86, 2.66, .8, timber, -5.47, 1.34, -3.66);
  box(.65, .52, .018, charcoal, -5.47, 1.1, -3.25);
  box(.57, .034, .04, bronze, -5.47, 1.31, -3.22);
  box(.59, .25, .02, glass, -5.47, 1.11, -3.232);
  box(2.66, .84, .92, timber, -3.17, .43, -2.55);
  contact(-3.17, -2.55, 3.4, 1.75, -.015);
  box(2.8, .085, 1.1, stone, -3.17, .91, -2.52, draft, .018);
  box(.082, .91, 1.1, stone, -4.54, .47, -2.52);
  box(.082, .91, 1.1, stone, -1.8, .47, -2.52);
  box(.5, .015, .4, bronze, -3.83, .96, -2.51, draft, .03);
  box(.39, .017, .29, charcoal, -3.83, .966, -2.51, draft, .032);
  beam([-3.83, .96, -2.88], [-3.83, 1.2, -2.88], .014, bronze);
  const faucet = add(new TorusGeometry(.105, .014, 8, 16, Math.PI), bronze, [-3.83, 1.21, -2.78]); faucet.rotation.y = Math.PI / 2;
  cylinder(.032, .032, .07, bronze, -3.83, 1.18, -2.675);
  cylinder(.18, .14, .035, walnut, -2.32, .973, -2.52);
  sphere(.07, .075, .07, leafLight, -2.28, 1.038, -2.48);
  sphere(.065, .07, .07, sandFabric, -2.4, 1.035, -2.56);
  for (const x of [-3.88, -2.49]) {
    cylinder(.23, .23, .065, walnut, x, .65, -1.65);
    for (const dx of [-.14, .14]) for (const dz of [-.14, .14]) beam([x + dx * 1.3, .035, -1.65 + dz * 1.3], [x + dx, .62, -1.65 + dz], .022, walnut);
    const ring = add(new TorusGeometry(.21, .012, 6, 16), bronze, [x, .25, -1.65]); ring.rotation.x = Math.PI / 2;
  }
  for (const x of [-3.9, -2.45]) {
    cylinder(.005, .005, .88, bronze, x, 2.73, -2.54);
    cylinder(.27, .32, .1, bronze, x, 2.24, -2.54);
    cylinder(.27, .27, .01, glow, x, 2.18, -2.54);
  }

  // Real, volumetric foliage. Deterministic placement keeps camera transitions stable.
  function plant(x: number, z: number, height: number, radius = .36) {
    cylinder(radius * .85, radius * .65, height * .27, ceramic, x, height * .135, z);
    cylinder(radius * .79, radius * .79, .025, earth, x, height * .269, z);
    for (let i = 0; i < 13; i++) {
      const angle = i * 2.399963;
      const leafHeight = height * (.5 + random() * .5);
      const spread = radius * (.8 + random() * .9);
      const lx = x + Math.cos(angle) * spread;
      const lz = z + Math.sin(angle) * spread;
      beam([x, height * .23, z], [lx, leafHeight * .85, lz], .012, leaf);
      const foliage = sphere(radius * .38, height * .19, radius * .045, i % 3 ? leaf : leafLight, lx, leafHeight * .84, lz, draft, 12);
      foliage.rotation.set(.23 * Math.cos(angle), -angle, -.45 * Math.sin(angle));
    }
    contact(x, z, radius * 3.6, radius * 3.6, -.014);
  }
  plant(-.77, -5.34, 2.05, .36);
  plant(5.24, -5.73, 1.85, .38);
  plant(-5.41, -7.97, 1.65, .4);
  plant(4.86, -8.22, 1.28, .36);
  plant(.98, -8.47, .69, .31);
  plant(3.97, 3.55, 1.74, .35);
  sofa(-2.76, -7.5, 2.63, 0, true);
  contact(-2.76, -7.5, 3.3, 1.8, -.014);
  cylinder(.48, .39, .36, stone, -2.72, .2, -6.28);
  cylinder(.11, .1, .2, ceramic, -2.72, .48, -6.28);
  sphere(.2, .1, .16, leaf, -2.72, .64, -6.28);
  // Outdoor dining in the same open volume, including four full chairs.
  cylinder(.91, .91, .075, walnut, 3.24, .79, -6.95);
  cylinder(.19, .25, .71, walnut, 3.24, .4, -6.95);
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    const g = new Group(); g.position.set(3.24 + Math.cos(angle) * 1.2, 0, -6.95 + Math.sin(angle) * 1.2); g.rotation.y = -angle - Math.PI / 2; draft.add(g);
    box(.54, .08, .53, sandFabric, 0, .47, 0, g, .035);
    box(.53, .41, .055, timber, 0, .72, .25, g, .023);
    for (const x of [-.22, .22]) for (const z of [-.21, .21]) beam([x, .04, z], [x, .46, z], .022, walnut, g);
  }
  cylinder(.2, .13, .1, ceramic, 3.24, .87, -6.95);
  sphere(.17, .09, .16, leaf, 3.24, .99, -6.95);

  // Depth outside the apartment: a planted neighbourhood, buildings and far hills.
  const distantStone = material({ color: '#c8cbc5', roughness: 1 });
  const distantWarm = material({ color: '#c4b7a4', roughness: .88 });
  const distantWindow = material({ color: '#8b9e9e', roughness: .42, metalness: .08 });
  const distantGreen = material({ color: '#869982', roughness: 1 });
  const hillMaterial = material({ color: '#b2c0b5', roughness: 1 });
  box(230, .5, 155, distantGreen, 0, -14.4, -89);
  for (let i = 0; i < 21; i++) {
    const x = -53 + i * 5.3 + random() * 2.8;
    const z = -24 - random() * 42;
    const width = 2.2 + random() * 3;
    const depth = 2.5 + random() * 3;
    const height = 9 + random() * 17;
    const bottom = -14;
    box(width, height, depth, i % 3 ? distantStone : distantWarm, x, bottom + height / 2, z);
    box(width + .15, .13, depth + .15, stone, x, bottom + height, z);
    const floors = Math.floor(height / 1.02);
    const columns = Math.max(2, Math.floor(width / .7));
    for (let floor = 1; floor < floors; floor++) {
      for (let col = 0; col < columns; col++) {
        box(.28, .53, .016, distantWindow, x - width / 2 + width / columns * (col + .5), bottom + floor * 1.02, z + depth / 2 + .012);
      }
    }
  }
  for (let i = 0; i < 37; i++) {
    const x = -58 + random() * 116, z = -15 - random() * 56;
    sphere(1.6 + random() * 1.1, 1.9 + random(), 1.6 + random(), i % 3 ? distantGreen : leaf, x, -10.5, z, draft, 8);
  }
  for (let i = 0; i < 8; i++) sphere(22, 12 + random() * 6, 15, hillMaterial, -105 + i * 30, -15, -118 - random() * 18, draft, 14);

  // Static architecture batches by material, reducing hundreds of details to ~25 draws.
  draft.updateMatrixWorld(true);
  const batches = new Map<string, { material: Material; castShadow: boolean; receiveShadow: boolean; geometries: BufferGeometry[] }>();
  const originalGeometries = new Set<BufferGeometry>();
  draft.traverse((object) => {
    if (!(object instanceof Mesh) || Array.isArray(object.material)) return;
    originalGeometries.add(object.geometry);
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const key = `${object.material.uuid}:${object.castShadow}:${object.receiveShadow}`;
    const batch = batches.get(key) ?? { material: object.material, castShadow: object.castShadow, receiveShadow: object.receiveShadow, geometries: [] as BufferGeometry[] };
    batch.geometries.push(geometry); batches.set(key, batch);
  });
  const group = new Group(); group.name = 'EME Select · Interior arquitetônico';
  const mergedGeometries: BufferGeometry[] = [];
  batches.forEach(({ geometries, material: mat, castShadow, receiveShadow }) => {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) return;
    mergedGeometries.push(geometry);
    const mesh = new Mesh(geometry, mat);
    mesh.castShadow = castShadow && mat !== glass && mat !== glow && mat !== hillMaterial && mat !== distantStone && mat !== distantWarm && mat !== distantGreen && mat !== distantWindow;
    mesh.receiveShadow = receiveShadow && mat !== glass; group.add(mesh);
  });
  originalGeometries.forEach((geometry) => geometry.dispose());
  draft.clear();

  const sala = { position: [2.85, 1.58, 4.25] as [number, number, number], target: [-1.1, .95, -2.1] as [number, number, number], fov: 60 };
  return {
    group,
    clearColor: new Color('#dbe4de').getStyle(),
    isInterior: true,
    hotspots: [
      { id: 'sala', label: 'Sala de estar', position: [-2.9, 1.27, .25] },
      { id: 'varanda', label: 'Varanda integrada', position: [1.1, 1.31, -6.8] },
      { id: 'cozinha', label: 'Cozinha', position: [-3.2, 1.4, -2.9] },
    ],
    views: {
      overview: sala,
      sala,
      varanda: { position: [.68, 1.65, -5.47], target: [.18, .9, -11.2], fov: 69 },
      cozinha: { position: [.15, 1.64, -.45], target: [-3.84, 1.27, -3.84], fov: 64 },
    },
    dispose: () => {
      mergedGeometries.forEach((geometry) => geometry.dispose());
      materials.forEach((mat) => mat.dispose());
      textures.forEach((texture) => texture.dispose());
      group.clear();
    },
  };
}
