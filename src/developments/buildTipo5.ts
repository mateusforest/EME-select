import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tipo5Outline, tipo5Walls, tipo5Windows } from './tipo5Navigation';
import { G400_ASSETS } from './g400';

export const planPoint=(x:number,z:number,y=0)=>new T.Vector3((x-1200)*.014,y,(z-530)*.014);

/** Conceptual geometry traced from the commercial Tipo 5 sheet. No measured heights. */
export function buildTipo5(){
  const root=new T.Group(),walls=new T.Group(),ceiling=new T.Group();
  root.add(walls,ceiling);
  const mat=(color:string,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
  const plaster=mat('#e9e5dc'),cream=mat('#d4ccbd'),dark=mat('#253e36'),black=mat('#202523',.34),ceramic=mat('#faf7ed',.2);
  const bronze=new T.MeshStandardMaterial({color:'#b49a74',metalness:.78,roughness:.25});
  const linen=new T.MeshPhysicalMaterial({color:'#d7d1c2',roughness:.95,sheen:.8,sheenColor:'#fbf3e5',sheenRoughness:.8});
  const sage=linen.clone();sage.color.set('#355244');sage.sheenColor.set('#8eaa80');
  const weave=new Uint8Array(64*64*4);for(let y=0;y<64;y++)for(let x=0;x<64;x++){const i=(y*64+x)*4,v=(x%4<2)===(y%4<2)?188:238;weave.set([v,v,v,255],i);}
  const fabricMap=new T.DataTexture(weave,64,64);fabricMap.wrapS=fabricMap.wrapT=T.RepeatWrapping;fabricMap.repeat.set(28,28);fabricMap.needsUpdate=true;linen.bumpMap=sage.bumpMap=fabricMap;linen.bumpScale=sage.bumpScale=.016;
  function texture(wood:boolean){
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=512;
    const c=canvas.getContext('2d')!;c.fillStyle=wood?'#ad8864':'#dedbd2';c.fillRect(0,0,512,512);
    let seed=41;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
    for(let i=0;i<8500;i++){c.fillStyle=`rgba(${wood?'58,36,19':'86,80,67'},${random()*.11})`;c.fillRect(random()*512,random()*512,wood?random()*130:2,1);}
    c.strokeStyle=wood?'#6a503e3f':'#ada99e60';c.lineWidth=1;
    for(let y=0;y<512;y+=wood?64:256){c.beginPath();c.moveTo(0,y);c.lineTo(512,y);c.stroke();}
    for(let x=0;x<512;x+=256){c.beginPath();c.moveTo(x,0);c.lineTo(x,512);c.stroke();}
    const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(wood?3:5,wood?4:3);map.anisotropy=4;return map;
  }
  const oak=mat('#d1b296');oak.map=texture(true);
  const tile=mat('#fffdf6',.64);tile.map=texture(false);
  const marbleCanvas=document.createElement('canvas');marbleCanvas.width=marbleCanvas.height=1024;const mc=marbleCanvas.getContext('2d')!;mc.fillStyle='#e6e5df';mc.fillRect(0,0,1024,1024);
  for(let k=0;k<12;k++){mc.beginPath();for(let y=-30;y<1060;y+=8){const x=k*137-420+y*.55+Math.sin(y*.012+k)*42+Math.sin(y*.046+k*4)*10;if(y===-30)mc.moveTo(x,y);else mc.lineTo(x,y);}mc.strokeStyle=k%3?'#898b862a':'#a98f6c39';mc.lineWidth=k%3?1.2:2.8;mc.stroke();}
  const marble=new T.CanvasTexture(marbleCanvas);marble.colorSpace=T.SRGBColorSpace;marble.wrapS=marble.wrapT=T.RepeatWrapping;marble.anisotropy=4;
  const stone=new T.MeshPhysicalMaterial({color:'#f0eee7',map:marble,roughness:.27,clearcoat:.35,clearcoatRoughness:.25});
  // Local CC0 photographic maps; procedural materials remain the load/error fallback.
  let disposed=false;const extraTextures:T.Texture[]=[],loads:Promise<void>[]=[];
  const pbr=(material:T.MeshStandardMaterial,asset:string,repeat:[number,number],diffuse=true,offset:[number,number]=[0,0])=>{
    for(const [channel,suffix] of [['map','diffuse'],['normalMap','nor_gl'],['roughnessMap','rough']] as const){if(!diffuse&&channel==='map')continue;
      loads.push(new Promise<void>(resolve=>{new T.TextureLoader().load(`${G400_ASSETS}materials/${asset}-${suffix}.jpg`,map=>{if(disposed){map.dispose();resolve();return;}map.wrapS=map.wrapT=T.RepeatWrapping;map.repeat.set(...repeat);map.offset.set(...offset);map.anisotropy=4;if(channel==='map')map.colorSpace=T.SRGBColorSpace;extraTextures.push(map);material[channel]=map;material.needsUpdate=true;resolve();},undefined,()=>resolve());}));
    }
  };
  oak.color.set('#cdc4b4');pbr(oak,'oak_wood_planks',[1,1]);oak.normalScale.set(.18,.18);oak.roughness=.7;
  // Sample one uninterrupted slab, keeping grout lines off counters and tables.
  pbr(stone,'marble_01',[.17,.15],true,[.51,.60]);stone.color.set('#ffffff');stone.normalScale.set(.08,.08);stone.roughness=.38;
  pbr(linen,'fabric_pattern_07',[3,3],false);linen.normalScale.set(.25,.25);pbr(sage,'fabric_pattern_07',[3,3],false);sage.normalScale.set(.25,.25);
  const glass=new T.MeshPhysicalMaterial({color:'#b7d1cf',transparent:true,opacity:.17,roughness:.1,metalness:.1,depthWrite:false,side:T.DoubleSide});
  const lamp=new T.MeshStandardMaterial({color:'#fff1cf',emissive:'#ffd697',emissiveIntensity:0,roughness:.3});
  function block(x:number,z:number,w:number,d:number,h:number,m:T.Material,y=h/2,group=root,round=0){
    const g=round?new RoundedBoxGeometry(w*.014,h,d*.014,2,Math.min(round,h/3,w*.004,d*.004)):new T.BoxGeometry(w*.014,h,d*.014);
    const mesh=new T.Mesh(g,m);mesh.position.copy(planPoint(x,z,y));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.navigation=group===root?'furniture':'wall';group.add(mesh);return mesh;
  }
  const outline=tipo5Outline;
  const shape=new T.Shape();outline.forEach(([x,z],i)=>{const p=planPoint(x,z);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});shape.closePath();
  const slabGeometry=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});slabGeometry.rotateX(-Math.PI/2);
  const slab=new T.Mesh(slabGeometry,tile);slab.position.y=-.18;slab.receiveShadow=true;slab.castShadow=true;slab.userData.navigation='floor';root.add(slab);
  // Wood floor in the intimate wing; the public circulation remains in stone.
  block(1250,451,185,275,.012,oak,.01);block(1607,465,180,285,.012,oak,.01);block(1288,620,280,100,.012,oak,.01);
  const ceilingMesh=new T.Mesh(new T.ShapeGeometry(shape),plaster);ceilingMesh.rotation.x=Math.PI/2;ceilingMesh.position.y=2.72;ceiling.add(ceilingMesh);
  function wall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1);const mesh=block((x1+x2)/2,(z1+z2)/2,width,10,2.7,plaster,1.35,walls);mesh.rotation.y=-Math.atan2(z2-z1,x2-x1);
    const skirting=block((x1+x2)/2,(z1+z2)/2,width,11,.09,cream,.045,walls);skirting.rotation.y=mesh.rotation.y;
  }
  function windowWall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1),angle=-Math.atan2(z2-z1,x2-x1);
    for(const [h,y,m] of [[.25,.125,plaster],[.17,2.615,plaster],[2.28,1.39,glass]] as const){const b=block((x1+x2)/2,(z1+z2)/2,width,5,h,m,y,walls);b.rotation.y=angle;if(m===glass)b.castShadow=false;}
    const count=Math.ceil(width/40);
    for(let i=0;i<=count;i++)block(x1+(x2-x1)*i/count,z1+(z2-z1)*i/count,2,3,2.38,bronze,1.38,walls);
  }
  tipo5Windows.forEach(w=>windowWall(...w));tipo5Walls.forEach(w=>wall(...w));
  // Door jambs and lintels share the collision plan's openings.
  for(const [x,z,width,turn] of [[1345,519,58,1],[1515,526,52,1],[1220,757,45,1],[810,687,65,1],[1155,800,70,0]]){
    for(const sign of [-1,1])block(x+(turn?0:sign*width/2),z+(turn?sign*width/2:0),turn?12:3,turn?3:12,2.3,oak,1.15,walls);
    block(x,z,turn?12:width,turn?width:12,.4,plaster,2.5,walls);
  }
  // Furniture is a restrained interpretation of the furnished plan, not a specification.
  block(970,440,255,220,.025,linen,.028,root,.01);
  block(940,353,180,53,.38,linen,.29,root,.1);block(852,424,50,155,.38,linen,.29,root,.1);
  block(940,329,180,13,.52,linen,.5,root,.06);block(830,420,14,163,.52,linen,.5,root,.06);
  for(let i=0;i<3;i++)block(880+i*53,350,46,37,.12,linen,.52,root,.05);
  for(let i=0;i<2;i++)block(850,398+i*52,37,45,.12,linen,.52,root,.05);
  block(990,350,27,20,.25,sage,.67,root,.06);block(850,465,22,28,.24,sage,.65,root,.05);
  block(980,460,76,48,.14,oak,.35,root,.06);block(980,460,48,26,.29,dark,.15);
  block(1125,440,15,150,.35,oak,.3);block(1136,430,4,78,.71,black,1.12);
  // Marble and oak media wall, inspired by the supplied G400 interiors.
  block(1146,440,5,175,2.52,stone,1.27,walls);
  for(const z of [340,350,360,520,530,540])block(1141,z,6,4,2.52,oak,1.27,walls);
  for(const [x,z,angle] of [[885,346,.15],[946,346,-.1],[849,402,1.3],[850,468,1.6]]){const cushion=block(x,z,29,13,.37,sage,.7,root,.065);cushion.rotation.y=angle;cushion.rotation.x=-.14;}
  for(const z of [366,409,451])block(835,z,1,1,.22,linen,.7);
  const coffeeTop=new T.Mesh(new T.CylinderGeometry(.43,.43,.035,48),stone);coffeeTop.position.copy(planPoint(1000,466,.48));coffeeTop.castShadow=true;root.add(coffeeTop);
  const coffeeBase=new T.Mesh(new T.CylinderGeometry(.27,.33,.43,40),bronze);coffeeBase.position.copy(planPoint(1000,466,.24));root.add(coffeeBase);
  // Kitchen in the lower left of the plan.
  block(882,781,122,30,.83,oak,.415);block(882,781,128,34,.045,stone,.86);
  block(829,746,28,66,.83,oak,.415);block(829,746,32,70,.045,stone,.86);
  block(945,665,42,65,2.12,cream,1.06);block(907,675,37,47,.83,oak,.415);block(907,675,40,50,.045,stone,.86);
  block(826,745,23,34,.022,black,.9);for(const z of [735,755])for(const x of [820,832]){const burner=new T.Mesh(new T.TorusGeometry(.055,.006,6,18),bronze);burner.rotation.x=Math.PI/2;burner.position.copy(planPoint(x,z,.92));root.add(burner);}
  block(860,780,28,16,.03,black,.89);block(860,780,24,12,.025,ceramic,.91);
  block(883,774,3,3,.27,bronze,1.03);
  for(let i=0;i<3;i++)block(837+i*35,797,1,2,.73,bronze,.4);
  block(884,794,125,3,.65,stone,1.2,walls);
  for(const x of [838,882,925]){block(x,790,40,20,.72,oak,1.96,walls);block(x,778,36,1,.025,lamp,1.6,walls);}
  block(945,643,34,2,.025,bronze,1.13);block(945,643,34,2,.025,bronze,1.65);
  const tap=new T.Mesh(new T.TorusGeometry(.105,.016,10,24,Math.PI),bronze);tap.position.copy(planPoint(883,774,1.08));root.add(tap);
  // Rectangular dining table and six upholstered chairs.
  block(1070,686,56,125,.09,stone,.8,root,.035);
  for(const z of [641,730])block(1070,z,30,10,.74,dark,.37);
  function chair(x:number,z:number,angle:number){
    const group=new T.Group();group.position.copy(planPoint(x,z));group.rotation.y=angle;root.add(group);
    const seat=new T.Mesh(new RoundedBoxGeometry(.43,.12,.43,2,.045),linen);seat.position.y=.46;seat.castShadow=true;group.add(seat);
    const back=new T.Mesh(new RoundedBoxGeometry(.43,.42,.085,2,.035),sage);back.position.set(0,.69,.22);back.castShadow=true;group.add(back);
    for(const sx of [-.16,.16])for(const sz of [-.16,.16]){const leg=new T.Mesh(new T.CylinderGeometry(.016,.012,.4,6),bronze);leg.position.set(sx,.2,sz);group.add(leg);}
  }
  for(const z of [651,687,723]){chair(1020,z,Math.PI/2);chair(1120,z,-Math.PI/2);}
  for(const z of [652,718])for(const x of [1055,1085]){const plate=new T.Mesh(new T.CylinderGeometry(.135,.12,.018,32),ceramic);plate.position.copy(planPoint(x,z,.86));root.add(plate);}
  // Beds, fitted wardrobes and bedside tables in both suites.
  function bed(x:number,z:number,rotation:number){
    const first=root.children.length;
    block(x,z+25,130,185,.018,cream,.025);
    block(x,z,115,150,.3,oak,.2,root,.06);block(x,z,113,148,.22,linen,.45,root,.08);
    block(x,z+29,115,87,.055,sage,.585,root,.025);
    block(x,z-78,130,9,1.05,oak,.56,root,.04);
    for(const dx of [-27,27])block(x+dx,z-47,45,29,.14,linen,.63,root,.06);
    for(const dx of [-78,78])block(x+dx,z-58,29,32,.38,oak,.24,root,.035);
    const pivot=new T.Group();pivot.position.copy(planPoint(x,z));const parts=root.children.slice(first);root.add(pivot);for(const part of parts){part.position.sub(pivot.position);pivot.add(part);}pivot.rotation.y=rotation;
  }
  bed(1240,414,Math.PI/2);bed(1610,429,-Math.PI/2);
  block(1250,552,132,26,2.35,cream,1.175);block(1680,560,27,80,2.35,cream,1.175);
  for(const x of [1200,1240,1280])block(x,567,1,1,1.75,bronze,1.25);
  for(const [x,z] of [[1163,414],[1692,429]])for(let i=-70;i<=70;i+=8)block(x,z+i,4,4,2.4,oak,1.22,walls);
  // Bathrooms and service room.
  for(const [x,z] of [[1385,425],[1470,425],[1310,750]]){
    block(x,z,48,78,.012,tile,.01);block(x,z+28,42,22,.75,oak,.375);block(x,z+28,45,25,.055,ceramic,.79);
    block(x,z+28,20,15,.07,ceramic,.86,root,.04);block(x,z+38,37,2,.65,glass,1.28);
    block(x-8,z-19,21,30,.43,ceramic,.23,root,.06);
  }
  block(750,641,38,29,.87,cream,.435);block(750,641,41,32,.04,stone,.895);
  block(762,759,38,36,.84,ceramic,.42);block(762,740,23,2,.25,black,.48,root,.04);
  // Planters and a small interior plant.
  for(let x=855;x<1130;x+=22){block(x,296,20,22,.24,dark,.16);const foliage=new T.Mesh(new T.IcosahedronGeometry(.2,1),sage);foliage.position.copy(planPoint(x,296,.43));foliage.scale.y=.7;root.add(foliage);}
  const pot=new T.Mesh(new T.CylinderGeometry(.17,.12,.3,20),cream);pot.position.copy(planPoint(1100,335,.15));root.add(pot);
  for(let i=0;i<7;i++){const leaf=new T.Mesh(new T.SphereGeometry(.15,10,8),sage);leaf.scale.set(.5,2,1);leaf.position.copy(planPoint(1100+Math.sin(i)*8,335+Math.cos(i)*8,.5+i*.025));leaf.rotation.z=Math.sin(i)*.5;root.add(leaf);}
  // Full-height pleated sheers at the glazing, visible only inside the apartment.
  const curtainMat=new T.MeshPhysicalMaterial({color:'#f1ece0',roughness:1,transparent:true,opacity:.65,side:T.DoubleSide,depthWrite:false});
  for(const [start,end,z] of [[823,852,324],[1109,1142,324],[1171,1200,323],[1310,1337,323],[1526,1552,333],[1660,1688,333]]){
    const geo=new T.PlaneGeometry((end-start)*.014,2.4,24,1),pos=geo.getAttribute('position');for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin(i%25/24*Math.PI*10)*.035);geo.computeVertexNormals();const curtain=new T.Mesh(geo,curtainMat);curtain.position.copy(planPoint((start+end)/2,z,1.38));ceiling.add(curtain);
  }
  // A warm cove, recessed spots and sculptural rings above the dining table.
  for(const [x,z,w,d] of [[980,325,310,2],[980,588,310,2],[822,453,2,263],[1137,453,2,263]])block(x,z,w,d,.022,lamp,2.64,ceiling);
  for(const z of [655,690,724]){const ring=new T.Mesh(new T.TorusGeometry(.25,.017,10,48),bronze);ring.rotation.x=Math.PI/2;ring.position.copy(planPoint(1070,z,2.07+(z%3)*.08));ceiling.add(ring);const glow=new T.Mesh(new T.TorusGeometry(.24,.009,8,48),lamp);glow.rotation.x=Math.PI/2;glow.position.copy(ring.position);glow.position.y-=.017;ceiling.add(glow);block(1070,z,1,1,.6,bronze,2.38,ceiling);}
  // Ceiling lamps only appear inside, preventing floating geometry in the cutaway.
  for(const [x,z] of [[970,440],[1070,686],[1240,414],[1610,429],[880,720]])block(x,z,45,7,.04,lamp,2.66,ceiling,.01);
  const lights=[[990,450],[1080,690],[1250,450],[1620,450],[860,700]].map(([x,z])=>{const light=new T.PointLight('#ffdbab',0,7,2);light.position.copy(planPoint(x,z,2.4));root.add(light);return light;});
  root.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.navigation)o.userData.navigation='furniture';});
  const applyFinish=(finish='original')=>{plaster.color.set(finish==='olive'?'#d9ddd0':'#e9e5dc');linen.color.set(finish==='linen'?'#ede2cf':'#d7d1c2');sage.color.set(finish==='linen'?'#ae9070':finish==='olive'?'#51613c':'#355244');oak.color.set(finish==='olive'?'#a8a08d':finish==='linen'?'#e1c7a4':'#cdc4b4');};
  return {root,walls,ceiling,lamp,lights,applyFinish,ready:Promise.all(loads),dispose:()=>{disposed=true;extraTextures.forEach(t=>t.dispose());}};
}
