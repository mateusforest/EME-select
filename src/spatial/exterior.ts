import {
  BoxGeometry, BufferGeometry, CylinderGeometry, Euler, Float32BufferAttribute,
  Group, IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, Quaternion, Vector3,
} from 'three';
import type { EnvironmentId } from '../data';
import type { SpatialScene } from './types';
import { architecturalMaterials, seededRandom } from './materials';
import type { ArchitecturalMaterials, MaterialName } from './materials';

type Shape = 'box' | 'cylinder' | 'sphere' | 'rock';
type Batch = { geometry: BufferGeometry; material: MaterialName; matrices: Matrix4[] };

function foliageGeometry() {
  const geometry = new IcosahedronGeometry(1, 2);
  const positions = geometry.attributes.position;
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
    const r=1+Math.sin(x*11+y*8)*Math.cos(z*9-y*3)*0.048+Math.sin(z*17+x*4)*0.028;
    positions.setXYZ(i,x*r,y*r,z*r);
  }
  // Preserve the smooth radial normals while giving the silhouette an organic edge.
  geometry.computeBoundingSphere();return geometry;
}

/** Architecture is batched by geometry + material, retaining real volumetric forms. */
class Builder {
  group: Group;
  materials: ArchitecturalMaterials;
  batches: Map<string, Batch>;
  frame: Matrix4;
  geometries: Record<Shape, BufferGeometry>;
  constructor(materials: ArchitecturalMaterials, parent?: Builder, frame = new Matrix4()) {
    this.materials = materials; this.group = parent?.group ?? new Group(); this.batches = parent?.batches ?? new Map(); this.frame = frame;
    this.geometries = parent?.geometries ?? { box: new BoxGeometry(1, 1, 1), cylinder: new CylinderGeometry(1, 1, 1, 12), sphere: foliageGeometry(), rock: new IcosahedronGeometry(1, 0) };
  }
  child(x: number, y: number, z: number, yaw = 0, scale = 1) {
    const matrix = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(0, yaw, 0)), new Vector3(scale, scale, scale));
    return new Builder(this.materials, this, this.frame.clone().multiply(matrix));
  }
  add(shape: Shape, material: MaterialName, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) {
    const key = `${shape}:${material}`;
    if (!this.batches.has(key)) this.batches.set(key, { geometry: this.geometries[shape], material, matrices: [] });
    const m = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(sx, sy, sz));
    this.batches.get(key)!.matrices.push(this.frame.clone().multiply(m));
  }
  box(mat: MaterialName, x: number, y: number, z: number, w: number, h: number, d: number, ry = 0, rx = 0, rz = 0) { this.add('box', mat, x, y, z, w, h, d, rx, ry, rz); }
  sphere(mat: MaterialName, x: number, y: number, z: number, w: number, h: number, d: number) { this.add('sphere', mat, x, y, z, w, h, d); }
  cylinder(mat: MaterialName, x: number, y: number, z: number, r: number, h: number, rz = 0, rx = 0) { this.add('cylinder', mat, x, y, z, r, h, r, rx, 0, rz); }
  branch(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number, radius: number, material: MaterialName = 'trunk') {
    const direction = new Vector3(x2 - x1, y2 - y1, z2 - z1); const length = direction.length();
    const key = `cylinder:${material}`;
    if (!this.batches.has(key)) this.batches.set(key, { geometry: this.geometries.cylinder, material, matrices: [] });
    const m = new Matrix4().compose(new Vector3((x1+x2)/2, (y1+y2)/2, (z1+z2)/2), new Quaternion().setFromUnitVectors(new Vector3(0,1,0), direction.normalize()), new Vector3(radius, length, radius));
    this.batches.get(key)!.matrices.push(this.frame.clone().multiply(m));
  }
  finish() {
    for (const [name, batch] of this.batches) {
      const mesh = new InstancedMesh(batch.geometry, this.materials[batch.material], batch.matrices.length);
      batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.name = name; mesh.castShadow = !['glass', 'water', 'sea'].includes(batch.material); mesh.receiveShadow = true;
      mesh.computeBoundingSphere(); this.group.add(mesh);
    }
    return this.group;
  }
}

function terrace(b: Builder, width: number, depth: number) {
  b.box('stone', 0, 0.06, 0, width, 0.2, depth);
  for (let x = -width/2 + 0.08; x < width/2; x += 0.25) b.box('wood', x, 0.171, 0, 0.23, 0.04, depth - 0.2);
}

function couch(b: Builder, x: number, z: number, yaw = 0) {
  const c = b.child(x, 0, z, yaw);
  c.box('wood', 0, 0.23, 0, 1.75, 0.22, 0.77);
  for (const side of [-1, 1]) { c.box('wood', side * 0.7, 0.17, 0, 0.08, 0.26, 0.65); c.box('linen', side*0.85, 0.55, 0, 0.12, 0.38, 0.8); }
  c.box('linen', 0, 0.46, 0.02, 1.58, 0.23, 0.67); c.box('linen', 0, 0.66, -0.3, 1.56, 0.42, 0.14);
  c.box('cushion', -0.53, 0.72, -0.13, 0.32, 0.31, 0.14, 0.08, -0.15);
  c.box('cushion', 0.48, 0.71, -0.13, 0.34, 0.29, 0.15, -0.13, -0.15);
}

function lounger(b: Builder, x: number, z: number, yaw = 0) {
  const c = b.child(x, 0, z, yaw);
  c.box('wood', 0, 0.18, 0, 0.62, 0.1, 1.65); c.box('linen', 0, 0.28, 0.25, 0.58, 0.14, 1.05);
  c.box('linen', 0, 0.47, -0.51, 0.58, 0.12, 0.62, 0, -0.52);
  for (const x1 of [-0.24, 0.24]) for (const z1 of [-0.55, 0.55]) c.box('wood', x1, 0.12, z1, 0.065, 0.24, 0.065);
}

function tableSet(b: Builder, x: number, z: number, radius = 0.46) {
  b.cylinder('wood', x, 0.69, z, radius, 0.08); b.cylinder('frame', x, 0.36, z, 0.06, 0.64);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI/2; const c = b.child(x + Math.sin(a) * 0.75, 0, z + Math.cos(a) * 0.75, a);
    c.box('wood', 0, 0.4, 0, 0.4, 0.08, 0.42); c.box('wood', 0, 0.64, 0.2, 0.39, 0.42, 0.055);
    for (const dx of [-0.16, 0.16]) for (const dz of [-0.16, 0.16]) c.box('frame', dx, 0.2, dz, 0.035, 0.4, 0.035);
  }
}

function pool(b: Builder, x: number, z: number, w = 6.4, d = 2.7) {
  b.box('stone', x, 0.12, z, w+0.45, 0.38, d+0.45);
  b.box('poolTile', x, 0.317, z, w, 0.02, d);
  b.box('water', x, 0.335, z, w-0.1, 0.018, d-0.1);
  // Pool steps and fine ripple highlights are actual shallow forms.
  for (let i = 0; i < 3; i++) b.box('paving', x - w/2 + 0.23 + i*0.2, 0.35-i*0.008, z, 0.22, 0.018, d-0.12);
  for (let i = 0; i < 10; i++) b.box('sea', x + 0.2 + Math.sin(i*1.9)*w*0.32, 0.35, z-d/2 + 0.2 + i*d/11, 0.4 + Math.sin(i)*0.25, 0.008, 0.015);
}

function glazing(b: Builder, x: number, y: number, z: number, w: number, h: number, side = false) {
  const g = b.child(x, y, z, side ? Math.PI/2 : 0);
  g.box('glass', 0, h/2, 0, w, h, 0.035);
  g.box('frame', 0, 0, 0.025, w, 0.055, 0.06); g.box('frame', 0, h, 0.025, w, 0.055, 0.06);
  const n = Math.max(1, Math.round(w/1.13));
  for (let i = 0; i <= n; i++) g.box('frame', -w/2 + w*i/n, h/2, 0.024, 0.048, h, 0.065);
}

function planter(b: Builder, x: number, y: number, z: number, w = 2, d = 0.45) {
  b.box('concrete', x, y+0.15, z, w, 0.3, d);
  b.box('grassDark', x, y+0.3, z, w-0.09, 0.03, d-0.09);
  for (let i = 0; i < Math.floor(w / 0.3); i++) b.sphere(i%2 ? 'leafLight' : 'leaf', x - w/2 + 0.2+i*0.3, y+0.43, z, 0.23, 0.22, 0.26);
}

function villa(b: Builder, options: { twoStorey?: boolean; width?: number } = {}) {
  const w = options.width ?? 8.6; const h = 2.55; const d = 4.2;
  terrace(b.child(0, 0, 1.35), w+1.25, 7.1);
  b.box('stone', 0, 0.3, 0, w, 0.24, d);
  b.box('warmStone', -w/2+0.18, h/2+0.36, 0, 0.36, h, d);
  b.box('stone', w/2-0.34, h/2+0.36, -0.55, 0.68, h, d-1.1);
  b.box('darkWood', 0, h/2+0.35, -d/2+0.13, w, h, 0.26);
  b.box('stone', 0, h+0.44, 0.13, w+1.18, 0.24, d+0.92);
  b.box('wood', 0, h+0.30, 0.3, w+0.58, 0.06, d+0.56);
  glazing(b, 0, 0.43, d/2, w-0.68, h-0.12);
  glazing(b, w/2, 0.43, 0.85, 2.24, h-0.12, true);
  for (let x = -w/2+0.6; x < w/2-0.6; x+=1.2) b.box('wood', x, h/2+0.4, -d/2+0.31, 0.055, h-0.06, 0.15);
  couch(b.child(0, 0.42, 0), -1.1, -0.35); couch(b.child(0, 0.42, 0), -2.3, 0.78, Math.PI/2);
  b.box('wood', -1.2, 0.87, 0.9, 1.2, 0.14, 0.7); b.box('wood', -1.2, 0.68, 0.9, 0.8, 0.3, 0.4);
  tableSet(b.child(0,0.42,0), w/2-1.6, 0.03);
  b.box('wood', -w/2+1.6, 0.91, -1.64, 2.2, 0.98, 0.46);
  b.box('stone', -w/2+1.6, 1.43, -1.64, 2.23, 0.06, 0.49);
  for (let i = 0; i < 3; i++) b.cylinder('light', 1.18 + i*0.4, h+0.09, 0.25, 0.07, 0.14);
  lounger(b.child(0,0.2,0), -w/2+0.9, 3.6); lounger(b.child(0,0.2,0), -w/2+1.8, 3.6);
  planter(b, w/2+0.38, 0.15, 2.55, 1.08, 0.74);
  if (options.twoStorey) {
    const f = b.child(1.1,h+0.64,-0.25);
    f.box('plaster', 0, 1.02, -0.35, w*0.62, 2.04, 2.95);
    f.box('darkInterior', 0, 1.0, 1.15, w*0.52, 1.65, 0.05);
    glazing(f, 0,0.1,1.18,w*0.52,1.8);
    f.box('stone', 0, 2.12, 0, w*0.7,0.2,3.76);
    f.box('stone', 0, 0.05, 1.8, w*0.72, 0.18,1.05);
    glazing(f,0,0.17,2.25,w*0.68,0.72);
    planter(f,-w*0.26,0.14,1.9,1.1,0.56);
  }
}

function gabledHouse(b: Builder, width = 4.7, depth = 4.0) {
  const wallH = 2.6, rise = 1.65;
  terrace(b.child(0,0,0.7),width+0.8,depth+2);
  b.box('stone',0,0.3,0,width,0.25,depth);
  b.box('darkWood',0,wallH/2+0.4,-depth/2,width,wallH,0.22);
  for (const side of [-1,1]) b.box('wood', side*(width/2-0.13),wallH/2+0.4,0,0.26,wallH,depth);
  const slope = Math.atan2(rise,width/2); const halfRoof = Math.sqrt((width/2)**2+rise**2)+0.27;
  for (const side of [-1,1]) {
    b.box('roof',side*width/4, wallH+0.4+rise/2,0,halfRoof,0.13,depth+0.78,0,0,-side*slope);
    for (let z=-depth/2-0.28;z<depth/2+0.35;z+=0.35) b.box('frame',side*width/4,wallH+0.49+rise/2,z,halfRoof,0.032,0.018,0,0,-side*slope);
  }
  // Triangular front/back infill closes the roof volume from any camera angle.
  const triangle = new BufferGeometry(); const positions: number[] = [];
  for (const side of [-1,1]) {
    const z=side*(depth/2-0.04);
    positions.push(-width/2,wallH+0.4,z,width/2,wallH+0.4,z,0,wallH+rise+0.4,z);
    positions.push(width/2,wallH+0.4,z,-width/2,wallH+0.4,z,0,wallH+rise+0.4,z);
  }
  triangle.setAttribute('position',new Float32BufferAttribute(positions,3)); triangle.computeVertexNormals();
  const g = new Mesh(triangle,b.materials.window); g.applyMatrix4(b.frame); g.castShadow=true; b.group.add(g);
  glazing(b,0,0.43,depth/2,width-0.48,wallH-0.05);
  b.box('frame',0,wallH+0.95,depth/2+0.04,0.07,1.25,0.07);
  for (const side of [-1,1]) glazing(b,side*width/2,0.67,0.05,1.9,1.7,true);
  couch(b.child(0,0.42,0),-0.65,-0.4); b.cylinder('wood',-0.45,0.9,0.9,0.49,0.14);
  b.box('warmStone',width/2-0.85,1.18,-depth/2+0.6,0.7,1.55,0.68); b.box('frame',width/2-0.85,1.08,-depth/2+0.955,0.47,0.61,0.04);
  b.cylinder('frame',width/2-0.85,3.65,-depth/2+0.61,0.09,2.6);
  lounger(b.child(0,0.18,0),1.15,depth/2+0.82,Math.PI/2);
}

function apartmentBuilding(b: Builder, floors = 6, w = 4.8, d = 3.8, greenery = true) {
  const story = 1.34;
  b.box('stone',0,0.12,0,w+1.4,0.28,d+1.4);
  b.box('darkInterior',0,story*floors/2+0.3,0,w-0.35,story*floors,d-0.35);
  for (let f=0;f<floors;f++) {
    const y=f*story+0.35;
    b.box('stone',0,y,0,w+0.85,0.16,d+1.05);
    for (const side of [-1,1]) {
      const facade=b.child(0,y,side*(d/2));
      facade.box('window',0,0.64,0,w-0.12,1.17,0.035);
      for (let i=0;i<5;i++) facade.box('frame',-w/2+i*w/4,0.66,side*0.038,0.055,1.18,0.06);
      b.box('glass',0,y+0.49,side*(d/2+0.4),w+0.62,0.74,0.035);
      b.box('frame',0,y+0.88,side*(d/2+0.4),w+0.62,0.035,0.05);
      if (greenery) planter(b,(f%2?1:-1)*w*0.27,y+0.06,side*(d/2+0.26),w*0.38,0.37);
      for (let i=0;i<8;i++) b.box('wood',-w/2+0.3+i*0.095,y+0.67,side*(d/2+0.13),0.048,1.13,0.14);
    }
    for (const side of [-1,1]) {
      b.box('window',side*w/2,y+0.62,0,0.04,1.1,d-0.18);
      b.box('glass',side*(w/2+0.3),y+0.47,0,0.035,0.72,d+0.71);
      b.box('frame',side*(w/2+0.3),y+0.86,0,0.045,0.035,d+0.71);
      for (let j=0;j<4;j++) b.box('frame',side*(w/2+0.028),y+0.65,-d/2+j*d/3,0.06,1.15,0.055);
    }
    for (const x of [-w/2,w/2]) for (const z of [-d/2,d/2]) b.box('stone',x,y+0.66,z,0.16,1.27,0.16);
  }
  const roofY=floors*story+0.4;
  b.box('stone',0,roofY,0,w+0.95,0.22,d+1.05);
  b.box('wood',0,roofY+0.14,0,w-0.22,0.1,d-0.1);
  planter(b,0,roofY+0.2,-d/2+0.24,w-0.2,0.58);
  for (const side of [-1,1]) planter(b,side*(w/2-0.2),roofY+0.2,0,0.49,d-0.3);
  tableSet(b.child(0,roofY+0.2,0),0,0);
  b.box('wood',0,roofY+1.75,-0.25,w-1,0.15,d-1.1);
  for (const x of [-1,1]) for (const z of [-1,1]) b.box('frame',x*(w/2-0.6),roofY+0.9,z*(d/2-0.7)-0.25,0.065,1.7,0.065);
}

function tree(b: Builder,x:number,y:number,z:number,scale:number,seed:number,kind:'broad'|'araucaria'|'palm'='broad') {
  const t=b.child(x,y,z,seed*0.73,scale); const random=seededRandom(seed*713+91);
  if(kind==='araucaria') {
    t.cylinder('trunk',0,2.85,0,0.095,5.7);
    for(let level=0;level<3;level++) for(let arm=0;arm<5;arm++) {
      const a=arm*Math.PI*0.4+level*0.67; const radius=1.42-level*0.21; const yy=3.6+level*0.6;
      t.branch(0,yy-0.36,0,Math.cos(a)*radius,yy,Math.sin(a)*radius,0.039);
      t.sphere(level%2?'leafDark':'leaf',Math.cos(a)*radius*0.82,yy+0.17,Math.sin(a)*radius*0.82,0.75,0.32,0.63);
    }
    t.sphere('leafDark',0,5.1,0,0.68,0.38,0.68);
  }else if(kind==='palm') {
    t.branch(0,0,0,0.18,3.1,0.05,0.095);
    for(let i=0;i<9;i++) {
      const a=i*0.698;
      for(let j=0;j<3;j++) {
        const r=0.3+j*0.45;
        t.sphere(i%2?'leaf':'leafLight',Math.sin(a)*r+0.18,3.18+Math.sin(j*1.1)*0.24,Math.cos(a)*r,0.35,0.07,0.26);
        t.branch(0.18,3.13,0.05,Math.sin(a)*r+0.18,3.18+Math.sin(j*1.1)*0.24,Math.cos(a)*r,0.022,'leafDark');
      }
    }
  }else {
    const h=2.0+random()*0.7; t.cylinder('trunk',0,h/2,0,0.07,h);
    for(let i=0;i<5;i++) {
      const a=i*Math.PI*0.4; const r=0.6+random()*0.35;
      const xx=Math.sin(a)*r,zz=Math.cos(a)*r,yy=h+random()*0.45;
      t.branch(0,h*0.58,0,xx,yy,zz,0.035);
      t.sphere(i%3===0?'leafDark':i%2?'leafLight':'leaf',xx,yy+0.1,zz,0.8+random()*0.27,0.6+random()*0.26,0.73+random()*0.26);
    }
    t.sphere('leafLight',0,h+0.68,0,0.91,0.56,0.9);
  }
}

function shrub(b:Builder,x:number,y:number,z:number,scale:number,seed:number) {
  const rand=seededRandom(seed); const t=b.child(x,y,z,rand()*6.28,scale);
  for(let i=0;i<3;i++) t.sphere(i%2?'leaf':'leafLight',(rand()-0.5)*0.3,0.16+rand()*0.11,(rand()-0.5)*0.3,0.3,0.21,0.29);
}

function stepPath(b:Builder, points:[number,number][], height:(x:number,z:number)=>number, width=0.78) {
  for(let p=1;p<points.length;p++) {
    const [x1,z1]=points[p-1], [x2,z2]=points[p]; const n=Math.ceil(Math.hypot(x2-x1,z2-z1)/0.7);
    for(let i=0;i<n;i++) {
      const t=i/n; const x=x1+(x2-x1)*t,z=z1+(z2-z1)*t;
      b.box('paving',x,height(x,z)+0.06,z,width,0.1,0.51,-Math.atan2(z2-z1,x2-x1)+Math.PI/2);
    }
  }
}

function terrain(b:Builder,id:EnvironmentId) {
  const rx=id==='urbano'?14.8:15.2,rz=id==='urbano'?11.5:11.2;
  const height=(x:number,z:number) => {
    if(id==='urbano') return 0;
    const rear=Math.max(0,-z-1)*0.095;
    return rear+(id==='serra'?0.12:0.06)*Math.sin(x*0.35)*Math.cos(z*0.45);
  };
  const positions:number[]=[],indices:number[]=[]; const rings=18,segments=96;
  for(let r=0;r<=rings;r++)for(let s=0;s<=segments;s++) {
    const angle=s/segments*Math.PI*2; const radial=r/rings;
    const undulation=1+Math.sin(angle*3+1)*0.022+Math.cos(angle*7)*0.014;
    const x=Math.cos(angle)*rx*radial*undulation,z=Math.sin(angle)*rz*radial*undulation;
    positions.push(x,height(x,z)-0.025,z);
  }
  for(let r=0;r<rings;r++)for(let s=0;s<segments;s++) { const a=r*(segments+1)+s,c=a+segments+1; indices.push(a,a+1,c,a+1,c+1,c); }
  const geometry=new BufferGeometry();geometry.setAttribute('position',new Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const mesh=new Mesh(geometry,b.materials[id==='litoral'?'sand':id==='urbano'?'paving':'grass']);mesh.name='sculpted-landscape';mesh.receiveShadow=true; b.group.add(mesh);
  // The plinth follows the same curved boundary as the landscape, including its gentle relief.
  const edgePositions:number[]=[];
  for(let s=0;s<segments;s++) {
    const a=(rings*(segments+1)+s)*3,c=a+3;
    const x1=positions[a],z1=positions[a+2],y1=positions[a+1];
    const x2=positions[c],z2=positions[c+2],y2=positions[c+1];
    edgePositions.push(x1,y1,z1,x2,-0.5,z2,x1,-0.5,z1,x1,y1,z1,x2,y2,z2,x2,-0.5,z2);
    edgePositions.push(0,-0.5,0,x1,-0.5,z1,x2,-0.5,z2);
  }
  const edge=new BufferGeometry();edge.setAttribute('position',new Float32BufferAttribute(edgePositions,3));edge.computeVertexNormals();
  const plinth=new Mesh(edge,b.materials.earth);plinth.name='contoured-landscape-edge';plinth.receiveShadow=true;plinth.castShadow=true;b.group.add(plinth);
  return height;
}

function addLandscape(b:Builder,id:EnvironmentId,height:(x:number,z:number)=>number) {
  const rand=seededRandom(id==='serra'?55:id==='litoral'?71:30);
  const count=id==='urbano'?22:44;
  for(let i=0;i<count;i++) {
    const angle=(i/count)*Math.PI*2+(rand()-0.5)*0.09;
    const r=0.77+rand()*0.2;const x=Math.cos(angle)*14*r,z=Math.sin(angle)*10*r;
    // Open the front arrival and keep the beach edge clear.
    if(z>5&&Math.abs(x)<7) continue;
    if(id==='litoral'&&x < -7.8) continue;
    const kind=id==='serra'&&i%3!==0?'araucaria':id==='litoral'&&i%3===0?'palm':'broad';
    tree(b,x,height(x,z),z,0.55+rand()*0.33,i+8,kind);
  }
  for(let i=0;i<110;i++) {
    const a=rand()*Math.PI*2,r=0.71+rand()*0.25,x=Math.cos(a)*14.1*r,z=Math.sin(a)*10*r;
    if(z>5&&Math.abs(x)<6.3)continue;
    if(id==='litoral'&&x < -7.5)continue;
    shrub(b,x,height(x,z),z,0.7+rand()*0.6,i+3);
    if(i%9===0)b.add('rock','warmStone',x+0.48,height(x,z)+0.1,z,0.39,0.3,0.27,0,rand()*3,rand()*0.4);
  }
}

function buildHome(b:Builder,height:(x:number,z:number)=>number) {
  villa(b.child(1.6,0.12,2.55));pool(b,1.8,6.72,7.5,2.5);
  gabledHouse(b.child(-7.05,height(-7,-2),-1.75,-0.12,0.83));
  apartmentBuilding(b.child(8,height(8,-5),-5.25,-0.13,0.82),6,4.6,3.8);
  villa(b.child(-0.65,height(0,-5.7),-5.6,0.2,0.5));
  stepPath(b,[[6.9,9],[7.6,6.5],[7.6,3.9],[6.5,1.1],[5.4,-1.4],[5.6,-4.5]],height,1.25);
  stepPath(b,[[-10,5],[-8.8,3],[-7.4,1]],height,0.85);
  for(const [x,z]of [[-4.2,-3.7],[3.7,-5.6],[-3.8,3.6],[6.6,-1]]as const)tree(b,x,height(x,z),z,0.77,Math.round(x*6+z*12+73));
}

function buildCoast(b:Builder,height:(x:number,z:number)=>number) {
  b.box('sea',-11.8,-0.008,-0.2,5.2,0.055,16.8);
  for(let i=0;i<14;i++)b.box('water',-10.9+Math.sin(i*1.7)*0.48,0.026,-7.8+i*1.12,1.2+Math.cos(i)*0.34,0.011,0.029,0.13);
  // A long timber boardwalk connects the three seaside addresses.
  const deck=b.child(-7.43,0.17,0,0.03);terrace(deck,1.1,17.9);
  for(let i=0;i<12;i++) {
    deck.box('wood',-0.51,0.53,-8+i*1.4,0.05,0.75,0.05);
    deck.box('wood',-0.51,0.87,-7.3+i*1.4,0.05,0.045,1.4);
  }
  villa(b.child(-1.1,0.13,3.2,-0.07),{width:7.2});pool(b,-1.15,7.3,6.2,2.3);
  villa(b.child(3.3,height(3,-4),-3.3,0.17,0.7),{twoStorey:true,width:6.3});
  villa(b.child(-2.8,height(-2,-5),-4.9,-0.06,0.48),{width:6.3});
  apartmentBuilding(b.child(9,height(9,-4),-4.1,-0.1,0.75),7,4.6,3.8);
  stepPath(b,[[-6.8,3.2],[-5,2.8],[-4.1,1.7]],height,0.9);
  stepPath(b,[[7.4,8],[7.3,3],[6.9,0.5],[6.4,-3.2]],height,1.25);
  for(let i=0;i<10;i++) {
    const x=-6.25+(i%2)*0.6,z=-7.6+i*1.5;
    shrub(b,x,0,z,0.6,i+25);
  }
}

function buildMountain(b:Builder,height:(x:number,z:number)=>number) {
  gabledHouse(b.child(1.3,height(1,2)+0.15,2,0.03,1.28),5.8,4.2);
  // Broad stone chimney and a covered side wing create an authored silhouette.
  b.box('warmStone',5.6,1.8,1.4,1.4,3.3,3.7);b.box('stone',5.6,3.48,1.4,1.57,0.18,3.94);
  b.box('frame',5.6,1.25,3.27,0.93,0.9,0.04);
  terrace(b.child(1.5,0.2,5.85),7.4,2.8);
  tableSet(b.child(0,0.41,0),3.65,5.92,0.62);
  gabledHouse(b.child(-7.8,height(-7,-0.5),-0.7,-0.24,0.66),4.1,4);
  gabledHouse(b.child(7.8,height(7,-5),-4.5,-0.13,0.61),4.8,4);
  gabledHouse(b.child(3.5,height(3,-6),-6.2,-0.13,0.48),4.8,4);
  gabledHouse(b.child(-1.1,height(-1,-5),-5.7,0.05,0.45),4.8,4);
  stepPath(b,[[-3.6,9],[-3.3,6],[-4.3,3],[-6.3,1.8]],height,1.05);
  stepPath(b,[[6.3,7.3],[7.3,3],[6.1,-0.6],[6.6,-3.2]],height,1.05);
  for(const [x,z]of [[-3.9,-3],[-9,3],[-5.7,5.1],[8.4,2.3]]as const)tree(b,x,height(x,z),z,0.9,Math.round(x*14+z*3+185),'araucaria');
  // A small reflecting garden pond sits below the main terrace.
  b.add('cylinder','stone',1.5,0.09,8.2,2.43,0.22,1.04);
  b.add('cylinder','water',1.5,0.21,8.2,2.22,0.024,0.88);
}

function streetFurniture(b:Builder,x:number,z:number,yaw=0) {
  const f=b.child(x,0,z,yaw);
  for(let i=0;i<4;i++)f.box('wood',0,0.4,-0.23+i*0.14,1.55,0.06,0.11);
  for(const dx of [-0.55,0.55])f.box('frame',dx,0.19,0,0.08,0.38,0.5);
  for(let i=0;i<3;i++)f.box('wood',0,0.7+i*0.12,-0.29,1.55,0.09,0.05);
}

function buildCity(b:Builder,height:(x:number,z:number)=>number) {
  // Shared streets and a planted square make one connected neighborhood.
  b.box('asphalt',0,0.015,0,25.4,0.03,1.82);
  b.box('asphalt',5.02,0.018,-1,1.75,0.032,16.4);
  for(const z of [-1.06,1.06])b.box('stone',0,0.064,z,25.2,0.12,0.16);
  for(let i=0;i<6;i++)b.box('plaster',3.3+i*0.37,0.04,0,0.2,0.015,1.16);
  for(let i=0;i<6;i++)b.box('plaster',5.03,0.042,2+i*0.37,1.16,0.015,0.2);
  apartmentBuilding(b.child(8.4,0.16,-4.7,0,0.87),10,4.4,3.85);
  apartmentBuilding(b.child(8.9,0.13,4.4,-0.06,0.95),4,4.7,4.05);
  apartmentBuilding(b.child(-6.8,0.16,-4.0,0,0.9),4,5.2,3.8);
  // Cafeteria glazed ground floor, awnings, and tables along the compact block.
  b.box('wood',-6.2,1.12,-1.92,4.1,0.12,1.22);
  for(let i=0;i<12;i++)b.box(i%2?'linen':'wood',-8.0+i*0.33,1.17,-1.92,0.32,0.024,1.22);
  for(let i=0;i<3;i++)tableSet(b.child(0,0.12,0),-8+i*1.6,-1.05,0.34);
  apartmentBuilding(b.child(-0.78,0.16,-5.45,0,0.64),4,4.7,3.7);
  // Low rectangular planters define a usable planted central plaza.
  b.box('paving',-3.1,0.1,4.4,13.2,0.17,5.75);
  for(const x of [-7.6,-3.4,0.8])for(const z of [2.3,6.65]) {
    planter(b,x,0.13,z,2.18,1.25);tree(b,x,0.43,z,0.73,Math.round(x*11+z*3+160));
  }
  b.add('cylinder','stone',-3.4,0.28,4.5,1.65,0.32,1.65);
  b.add('cylinder','water',-3.4,0.455,4.5,1.45,0.025,1.45);
  b.cylinder('stone',-3.4,0.68,4.5,0.46,0.44);
  for(const [x,z,yaw]of [[-6.4,4.2,Math.PI/2],[-0.25,4.2,-Math.PI/2],[-3.4,1.85,0],[-3.4,7.1,Math.PI]]as const)streetFurniture(b,x,z,yaw);
  for(const x of [-10.4,2.75,11.8])for(const z of [-1.3,1.4,7.7]){
    b.cylinder('frame',x,1.37,z,0.035,2.7);b.cylinder('light',x,2.74,z,0.11,0.13);
  }
  // A few quiet cars establish human scale; each has wheels and glazed cabin.
  for(const [x,z,yaw]of [[-9,0,Math.PI/2],[1.8,0,Math.PI/2],[5,6.3,0]]as const){
    const c=b.child(x,0.16,z,yaw,0.8); c.box('plaster',0,0.25,0,0.84,0.32,1.86);c.box('window',0,0.51,-0.05,0.73,0.29,0.97);
    for(const xx of [-0.44,0.44])for(const zz of [-0.59,0.59])c.cylinder('frame',xx,0.14,zz,0.15,0.07,Math.PI/2);
  }
  stepPath(b,[[-10,7.7],[-10,5.9],[-10,3.3]],height,1.0);
}

export function buildExteriorScene(id: EnvironmentId): SpatialScene {
  const materials=architecturalMaterials();const b=new Builder(materials);b.group.name=`eme-${id}-architectural-model`;
  const height=terrain(b,id);
  if(id==='litoral')buildCoast(b,height);else if(id==='serra')buildMountain(b,height);else if(id==='urbano')buildCity(b,height);else buildHome(b,height);
  addLandscape(b,id,height); b.finish();
  const hotspots: SpatialScene['hotspots'] = id==='todos' ? [
    {id:'serra-01',label:'Casas com jardim',position:[-7.1,4.3,-1.8]},
    {id:'litoral-01',label:'Arquitetura autoral',position:[1.5,3.55,3.1]},
    {id:'urbano-01',label:'Apartamentos',position:[8,9.1,-5.2]},
  ] : id==='litoral' ? [
    {id:'litoral-01',label:'Casas de praia',position:[-1.1,3.6,3.2]},
    {id:'litoral-02',label:'Condomínios horizontais',position:[3.3,4.8,-3.3]},
    {id:'litoral-03',label:'Vista para o mar',position:[9,9.8,-4.1]},
  ] : id==='serra' ? [
    {id:'serra-01',label:'Casas na serra',position:[1.3,6.3,2]},
    {id:'serra-02',label:'Cabanas',position:[-7.8,3.7,-0.7]},
    {id:'serra-03',label:'Condomínios',position:[7.8,3.9,-4.5]},
  ] : [
    {id:'urbano-02',label:'Compactos',position:[-6.8,6.7,-4]},
    {id:'urbano-03',label:'Condomínios verticais',position:[8.4,13.65,-4.7]},
    {id:'urbano-01',label:'Apartamentos',position:[8.9,7.1,4.4]},
  ];
  const views: SpatialScene['views'] = {
    overview:{position:id==='urbano'?[24,19,29]:[22,17,26],target:[0,2.4,0],fov:43},
  };
  for(const hotspot of hotspots) {
    const [x,y,z]=hotspot.position;
    views[hotspot.id]={position:[x+8,y+4,z+12],target:[x,y*0.48,z],fov:42};
  }
  return {
    group:b.group,hotspots,views,clearColor:'#f3efe5',
    dispose:()=>{
      const geometries=new Set<BufferGeometry>(); b.group.traverse(o=>{if(o instanceof Mesh)geometries.add(o.geometry);});
      geometries.forEach(g=>g.dispose());
      const textures=new Set<import('three').Texture>();
      Object.values(materials).forEach(m=>{if(m.map)textures.add(m.map);m.dispose();});textures.forEach(t=>t.dispose());
    },
  };
}
