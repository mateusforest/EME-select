import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { tipo5Outline, tipo5Walls, tipo5Windows, tipo5Doors, TIPO5_SCALE } from './tipo5Navigation';
import { G400_ASSETS } from './g400';
import {upholstered,piping,vesselBasin,mixer,diningChair} from './tipo5Craft';

export const planPoint=(x:number,z:number,y=0)=>new T.Vector3((x-1200)*TIPO5_SCALE,y,(z-530)*TIPO5_SCALE);

/** Conceptual geometry traced from the commercial Tipo 5 sheet. No measured heights. */
export function buildTipo5(){
  const root=new T.Group(),walls=new T.Group(),ceiling=new T.Group();root.name='Unidade 305 · Tipo 5';
  root.add(walls,ceiling);
  const mat=(color:string,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
  const plaster=mat('#e9e5dc'),cream=mat('#d4ccbd'),dark=mat('#253e36'),black=mat('#202523',.34),ceramic=mat('#faf7ed',.2);
  const bronze=new T.MeshStandardMaterial({color:'#b49a74',metalness:.78,roughness:.25});
  const linen=new T.MeshPhysicalMaterial({color:'#d7d1c2',roughness:.95,sheen:.8,sheenColor:'#fbf3e5',sheenRoughness:.8});
  const finishFollowers:[T.MeshStandardMaterial,T.MeshStandardMaterial][]=[];
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
  const tile=mat('#dbd4c5',.48);tile.map=texture(false);tile.map.repeat.set(.5/1.2,.5/1.2);
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
  oak.color.set('#cdc4b4');pbr(oak,'oak_wood_planks',[2,1.4]);oak.normalScale.set(.18,.18);oak.roughness=.7;
  const floorOak=mat('#bda88d',.72);pbr(floorOak,'oak_wood_planks',[.45,.45]);floorOak.normalScale.set(.15,.15);
  // Sample one uninterrupted slab, keeping grout lines off counters and tables.
  pbr(stone,'marble_01',[.17,.15],false,[.51,.60]);stone.color.set('#f4f1e9');stone.normalScale.set(.025,.025);stone.roughness=.32;
  pbr(linen,'fabric_pattern_07',[3,3],false);linen.normalScale.set(.25,.25);pbr(sage,'fabric_pattern_07',[3,3],false);sage.normalScale.set(.25,.25);
  const glass=new T.MeshPhysicalMaterial({color:'#dce3dd',transparent:true,opacity:.17,roughness:.28,metalness:0,specularIntensity:.15,depthWrite:false,side:T.DoubleSide});
  const frostCanvas=document.createElement('canvas');frostCanvas.width=64;frostCanvas.height=256;const fc=frostCanvas.getContext('2d')!,fg=fc.createLinearGradient(0,0,0,256);
  fg.addColorStop(0,'#e2e9e7');fg.addColorStop(.5,'#d6e0dc');fg.addColorStop(1,'#aebfaf');fc.fillStyle=fg;fc.fillRect(0,0,64,256);
  const frostMap=new T.CanvasTexture(frostCanvas);frostMap.colorSpace=T.SRGBColorSpace;
  const frost=new T.MeshStandardMaterial({map:frostMap,color:'#edf2ef',roughness:.9,emissive:'#d9e4df',emissiveMap:frostMap,emissiveIntensity:.23,side:T.DoubleSide});
  const lamp=new T.MeshStandardMaterial({color:'#fff1cf',emissive:'#ffd697',emissiveIntensity:0,roughness:.3});
  function block(x:number,z:number,w:number,d:number,h:number,m:T.Material,y=h/2,group=root,round=0){
    const g=round?new RoundedBoxGeometry(w*TIPO5_SCALE,h,d*TIPO5_SCALE,3,Math.min(round,h/3,w*.004,d*.004)):new T.BoxGeometry(w*TIPO5_SCALE,h,d*TIPO5_SCALE);
    const mesh=new T.Mesh(g,m);mesh.position.copy(planPoint(x,z,y));mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.navigation=group===root?'furniture':'wall';group.add(mesh);return mesh;
  }
  const outline=tipo5Outline;
  const shape=new T.Shape();outline.forEach(([x,z],i)=>{const p=planPoint(x,z);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});shape.closePath();
  const slabGeometry=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});slabGeometry.rotateX(-Math.PI/2);
  const slab=new T.Mesh(slabGeometry,tile);slab.position.y=-.18;slab.receiveShadow=true;slab.castShadow=true;slab.userData.navigation='floor';root.add(slab);
  // Floors and ceiling use the same non-mirrored footprint.
  const woodArea=(points:[number,number][])=>{const area=new T.Shape();points.forEach(([x,z],i)=>{const p=planPoint(x,z);if(i)area.lineTo(p.x,-p.z);else area.moveTo(p.x,-p.z);});area.closePath();const g=new T.ShapeGeometry(area);g.rotateX(-Math.PI/2);const floor=new T.Mesh(g,floorOak);floor.position.y=.008;floor.receiveShadow=true;root.add(floor);};
  woodArea([[1160,320],[1340,320],[1340,565],[1160,565]]);
  woodArea([[1525,320],[1695,320],[1695,610],[1440,610],[1440,505],[1525,505]]);
  woodArea([[1200,570],[1345,570],[1345,500],[1435,500],[1435,690],[1200,690]]);
  const ceilingGeometry=new T.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:false});ceilingGeometry.rotateX(-Math.PI/2);
  const ceilingMesh=new T.Mesh(ceilingGeometry,plaster);ceilingMesh.position.y=2.7;ceilingMesh.name='Forro contínuo · mesma projeção do piso';ceilingMesh.receiveShadow=true;ceiling.add(ceilingMesh);
  function wall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1);const mesh=block((x1+x2)/2,(z1+z2)/2,width,10,2.7,plaster,1.35,walls);mesh.rotation.y=-Math.atan2(z2-z1,x2-x1);
    const skirting=block((x1+x2)/2,(z1+z2)/2,width,11,.09,cream,.045,walls);skirting.rotation.y=mesh.rotation.y;
  }
  function windowWall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1),angle=-Math.atan2(z2-z1,x2-x1);
    for(const [h,y,m] of [[.25,.125,plaster],[.17,2.615,plaster],[2.28,1.39,frost]] as const){const b=block((x1+x2)/2,(z1+z2)/2,width,5,h,m,y,walls);b.rotation.y=angle;if(m===frost){b.castShadow=false;b.name='Janela fosca';}}
    const count=Math.ceil(width/40);
    for(let i=0;i<=count;i++)block(x1+(x2-x1)*i/count,z1+(z2-z1)*i/count,2,8,2.38,black,1.38,walls);
    for(const y of [.29,2.51]){const rail=block((x1+x2)/2,(z1+z2)/2,width,8,.045,black,y,walls);rail.rotation.y=angle;}
  }
  tipo5Windows.forEach(w=>windowWall(...w));tipo5Walls.forEach(w=>wall(...w));
  // Interior portals and closed entrance: the entrance faces the common hall.
  for(const [x,z,width,turn,entrance] of tipo5Doors){
    for(const sign of [-1,1])block(x+(turn?0:sign*width/2),z+(turn?sign*width/2:0),turn?12:3,turn?3:12,2.3,oak,1.15,walls);
    block(x,z,turn?12:width,turn?width:12,.4,plaster,2.5,walls);
    if(entrance){const door=block(x,z,width-4,3,2.28,oak,1.14,walls);door.name='Porta de entrada · corredor comum';block(x+width*.32,z-2.5,2,3,.23,bronze,1.04,walls);}
  }
  // Furniture is a restrained interpretation of the furnished plan, not a specification.
  const seam=mat('#cfc7b9',.95),rug=mat('#d5ccbc',1);rug.bumpMap=fabricMap;rug.bumpScale=.009;
  block(970,440,255,220,.018,rug,.018,root,.02);
  function sofaPart(x:number,z:number,w:number,d:number,h:number,y:number,piped=false){
    const mesh=upholstered(w*TIPO5_SCALE,h,d*TIPO5_SCALE,linen);mesh.position.copy(planPoint(x,z,y));root.add(mesh);
    if(piped){const edge=piping(w*TIPO5_SCALE-.012,d*TIPO5_SCALE-.012,seam,h*.27);edge.position.copy(mesh.position);root.add(edge);}return mesh;
  }
  // The L stays inside the sofa footprint used by the walking system.
  sofaPart(974,353,218,46,.25,.235);sofaPart(884,425,43,145,.25,.235);
  sofaPart(974,333,217,9,.59,.555);sofaPart(867,424,9,143,.59,.555);sofaPart(1078,352,8,46,.54,.51);sofaPart(884,492,43,8,.54,.51);
  for(const x of [914,977,1040])sofaPart(x,357,61,35,.16,.434,true);
  for(const z of [401,456])sofaPart(887,z,32,53,.16,.434,true);
  for(const [x,z] of [[873,340],[1071,340],[1071,368],[876,484],[900,484]]){const foot=new T.Mesh(new T.CylinderGeometry(.025,.021,.11,12),oak);foot.position.copy(planPoint(x,z,.055));foot.castShadow=true;root.add(foot);}
  block(980,460,76,48,.14,oak,.35,root,.06);block(980,460,48,26,.29,dark,.15);
  block(1125,440,15,150,.35,oak,.3);block(1136,430,4,78,.71,black,1.12);
  // Marble and oak media wall, inspired by the supplied G400 interiors.
  block(1146,440,5,175,2.52,stone,1.27,walls);
  for(const z of [334,340,346,352,358,364,516,522,528,534,540,546])block(1141,z,6,4,2.52,oak,1.27,walls);
  for(const [i,[x,z,angle]] of [[922,344,.15],[989,344,-.1],[877,401,1.3],[878,457,1.6]].entries()){
    const geometry=new T.SphereGeometry(1,24,16),vertices=geometry.attributes.position;
    for(let j=0;j<vertices.count;j++){
      const soft=(v:number)=>Math.sign(v)*Math.pow(Math.abs(v),.58);
      vertices.setXYZ(j,soft(vertices.getX(j))*.23,soft(vertices.getY(j))*.205,soft(vertices.getZ(j))*.085);
    }
    geometry.computeVertexNormals();const cushion=new T.Mesh(geometry,i%3===1?linen:sage);
    cushion.position.copy(planPoint(x,z,.74));cushion.rotation.set(-.2,angle,.06*(i%2?1:-1));cushion.castShadow=true;cushion.receiveShadow=true;root.add(cushion);
  }
  // Kitchen L, refrigerator and laundry follow the supplied plan exactly in position.
  const steel=new T.MeshStandardMaterial({color:'#a7ada9',metalness:.72,roughness:.34});
  block(880,775,166,36,.65,oak,.325);
  // Four countertop pieces leave a real opening around the drop-in sink.
  block(833.25,775,76.5,39,.04,stone,.88);block(938.25,775,53.5,39,.04,stone,.88);
  block(891.5,761.5,40,12,.04,stone,.88);block(891.5,788.5,40,12,.04,stone,.88);
  block(948,730,31,82,.84,oak,.42);block(948,730,35,84,.04,stone,.88);
  block(770,770,44,45,2.16,cream,1.08);block(770,746.5,41,1,2.08,steel,1.08);
  block(770,745.8,41,.7,.018,black,.82);block(788,745,1,2,.42,bronze,1.43);
  for(const x of [816,860,904]){block(x,755.8,40,1,.71,cream,.44);block(x,754.8,18,1,.014,bronze,.73);}
  block(947,718,25,44,.02,black,.91);
  for(const x of [940,954])for(const z of [707,730]){const burner=new T.Mesh(new T.TorusGeometry(.055,.005,8,24),steel);burner.rotation.x=Math.PI/2;burner.position.copy(planPoint(x,z,.926));root.add(burner);}
  block(931,724,1,39,.55,black,.43);block(930,724,1,29,.34,steel,.42);block(929,724,1,26,.24,black,.45);block(928,724,2,28,.018,steel,.68);
  // Sink on the south run, with a recessed bowl and mixer against the backsplash.
  const sinkMaterial=steel.clone();sinkMaterial.color.set('#8d9997');sinkMaterial.roughness=.28;
  block(891.5,775,40,18,.018,sinkMaterial,.722);
  for(const x of [871.5,911.5])block(x,775,1,19,.174,sinkMaterial,.809);
  for(const z of [766,784])block(891.5,z,41,1,.174,sinkMaterial,.809);
  for(const x of [870.5,912.5])block(x,775,2,21,.015,steel,.91);
  for(const z of [765,785])block(891.5,z,44,2,.015,steel,.91);
  const kitchenDrain=new T.Mesh(new T.CylinderGeometry(.025,.025,.007,24),black);kitchenDrain.position.copy(planPoint(891.5,775,.735));root.add(kitchenDrain);
  const tap=mixer(bronze,.32);tap.position.copy(planPoint(889,790,.92));root.add(tap);
  block(880,794,169,2,.57,stone,1.19,walls);
  for(const x of [819,867,915]){block(x,785,45,20,.66,cream,2.06,walls);block(x,774,44,1,.63,cream,2.06,walls);block(x,773,17,1,.014,bronze,1.81,walls);block(x,776,41,1,.012,lamp,1.72,walls);}
  // Gourmet counter beside living; the tall block is the grill, not a refrigerator.
  block(837,574,48,65,2.7,plaster,1.35,walls);block(838,608,34,1,.59,black,1.26,walls);
  block(909,578,89,33,.88,cream,.44);block(909,578,94,36,.04,stone,.91);
  for(const x of [885,931]){block(x,546,27,25,.09,linen,.58,root,.03);for(const dx of [-9,9])for(const dz of [-8,8])block(x+dx,546+dz,1,1,.55,bronze,.275);}
  block(760,640,94,34,.85,cream,.425);block(760,640,97,37,.045,stone,.89);block(735,641,27,22,.017,steel,.922);block(735,641,23,18,.018,black,.932);
  block(829,645,24,53,2.1,cream,1.05);for(let z=623;z<677;z+=7)block(842,z,1,4,1.9,oak,1.08);
  // Rectangular dining table and eight upholstered chairs.
  block(1050,693,62,112,.09,stone,.8,root,.035);
  for(const z of [655,730]){
    block(1050,z,30,10,.74,oak,.37,root,.025);
    for(let x=1036;x<=1064;x+=3)block(x,z-5.3,1.2,1,.70,oak,.37);
  }
  const chairFabric=linen.clone();chairFabric.side=T.DoubleSide;const chairWood=oak.clone();chairWood.side=T.DoubleSide;finishFollowers.push([chairFabric,linen],[chairWood,oak]);
  function chair(x:number,z:number,angle:number){const group=diningChair(chairWood,chairFabric);group.position.copy(planPoint(x,z));group.rotation.y=angle;root.add(group);}
  for(const z of [657,696,731]){chair(1009,z,Math.PI/2);chair(1093,z,-Math.PI/2);}chair(1050,626,Math.PI);chair(1050,768,0);
  for(const z of [662,720])for(const x of [1036,1066]){const plate=new T.Mesh(new T.CylinderGeometry(.135,.12,.018,32),ceramic);plate.position.copy(planPoint(x,z,.86));root.add(plate);}
  // Styling follows the warm stone, linen and green palette of the G400 references.
  for(const [x,z,h,colour] of ([[972,458,.035,'#e7e2d6'],[976,460,.026,'#566557']] as const))block(x,z,24,17,h,mat(colour),.44+h);
  function vase(x:number,z:number,y:number){
    const body=new T.Mesh(new T.LatheGeometry([new T.Vector2(.075,0),new T.Vector2(.13,.06),new T.Vector2(.1,.21),new T.Vector2(.05,.27)],24),ceramic);body.position.copy(planPoint(x,z,y));body.castShadow=true;root.add(body);
    for(let i=0;i<4;i++){const stem=new T.Mesh(new T.CylinderGeometry(.003,.004,.34,5),dark);stem.position.copy(planPoint(x+i*1.6,z,y+.36));stem.rotation.z=(i-1.5)*.13;root.add(stem);const leaf=new T.Mesh(new T.SphereGeometry(.08,8,6),sage);leaf.scale.set(.55,1.8,.16);leaf.position.copy(planPoint(x+i*2,z,y+.48));leaf.rotation.z=i*.4;root.add(leaf);}
  }
  vase(1050,695,.86);
  // Bed orientation, sizes and wardrobes correspond to the plan, with clear door routes.
  function bed(x:number,z:number,rotation:number){
    const group=new T.Group();group.position.copy(planPoint(x,z));group.rotation.y=rotation;root.add(group);
    const part=(dx:number,dz:number,w:number,d:number,h:number,material:T.Material,y:number)=>{const mesh=new T.Mesh(new RoundedBoxGeometry(w*TIPO5_SCALE,h,d*TIPO5_SCALE,3,.04),material);mesh.position.set(dx*TIPO5_SCALE,y,dz*TIPO5_SCALE);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);};
    part(0,0,99,126,.27,oak,.19);part(0,0,98,124,.22,linen,.435);
    const duvet=upholstered(98*TIPO5_SCALE,.13,93*TIPO5_SCALE,linen);duvet.position.set(0,.565,14*TIPO5_SCALE);group.add(duvet);
    const throwGeo=new T.PlaneGeometry(2.08,.6,56,16),v=throwGeo.attributes.position;
    for(let i=0;i<v.count;i++){const x=v.getX(i),z=v.getY(i);v.setZ(i,Math.sin(z*21+x*5)*.004-Math.sin(Math.max(0,(Math.abs(x)-.925)/.115)*Math.PI/2)*.22);}throwGeo.computeVertexNormals();
    const throwMaterial=sage.clone();throwMaterial.side=T.DoubleSide;finishFollowers.push([throwMaterial,sage]);const cover=new T.Mesh(throwGeo,throwMaterial);cover.rotation.x=-Math.PI/2;cover.position.set(0,.695,.65);cover.castShadow=true;cover.receiveShadow=true;group.add(cover);
    part(0,-64,112,5,1.05,oak,.56);const headboard=upholstered(108*TIPO5_SCALE,.87,.085,linen);headboard.position.set(0,.65,-61*TIPO5_SCALE);group.add(headboard);for(const dx of [-25,25]){const pillow=upholstered(.7,.18,.46,linen);pillow.position.set(dx*TIPO5_SCALE,.635,-39*TIPO5_SCALE);pillow.rotation.y=dx>0?.04:-.05;group.add(pillow);}

    for(const dx of [-70,70]){part(dx,-43,27,29,.39,oak,.215);const lampBase=new T.Mesh(new T.CylinderGeometry(.065,.075,.025,24),bronze);lampBase.position.set(dx*TIPO5_SCALE,.423,-43*TIPO5_SCALE);group.add(lampBase);const globe=new T.Mesh(new T.SphereGeometry(.082,24,16),lamp);globe.position.set(dx*TIPO5_SCALE,.52,-43*TIPO5_SCALE);group.add(globe);}
  }
  bed(1228,409,Math.PI/2);bed(1628,409,-Math.PI/2);
  // Vertical oak panels behind the two opposed headboards; no change to the plan.
  for(const x of [1166,1688])for(let z=340;z<495;z+=5)block(x,z,2.2,2.4,2.48,oak,1.26,walls);

  block(1235,549,104,30,2.35,cream,1.175);block(1568,591,251,32,2.35,cream,1.175);
  for(const x of [1198,1233,1268])block(x,532,1,1,1.55,bronze,1.25);
  for(let x=1453;x<1690;x+=37)block(x,574,1,1,1.55,bronze,1.25);
  block(1350,674,159,34,.74,cream,.37);block(1350,674,162,36,.035,stone,.765);
  function toilet(x:number,z:number,turn=0){
    const group=new T.Group();group.position.copy(planPoint(x,z));group.rotation.y=turn;root.add(group);
    const bowl=new T.Mesh(new T.SphereGeometry(1,24,16),ceramic);bowl.scale.set(.18,.17,.25);bowl.position.set(0,.27,0);bowl.castShadow=true;group.add(bowl);
    const base=new T.Mesh(new T.CylinderGeometry(.13,.15,.22,24),ceramic);base.position.set(0,.12,.025);group.add(base);
    const seat=new T.Mesh(new T.TorusGeometry(.14,.029,12,36),ceramic);seat.rotation.x=Math.PI/2;seat.scale.y=1.36;seat.position.set(0,.435,-.01);group.add(seat);
    const tank=new T.Mesh(new RoundedBoxGeometry(.34,.4,.16,3,.03),ceramic);tank.position.set(0,.38,.23);group.add(tank);
  }
  function vanity(x:number,z:number,w:number,d:number,side=false){
    block(x,z,w,d,.63,oak,.44);block(x,z,w+1,d+1,.035,stone,.78);
    const basin=vesselBasin(ceramic,steel);basin.scale.z=.72;if(side)basin.rotation.y=Math.PI/2;basin.position.copy(planPoint(x,z,.8));root.add(basin);
    const tap=mixer(bronze,.25);tap.position.copy(planPoint(x+(side?11:0),z+(side?0:11),.8));if(side)tap.rotation.y=Math.PI/2;root.add(tap);
    const mirror=block(x+(side?14:0),z+(side?0:18),side?1:w,side?d:1,.83,steel,1.43,walls);mirror.name='Espelho acima da bancada';
  }
  // Two separate en-suite bathrooms; shower screens stay clear of their access doors.
  for(const [left,right] of [[1350,1430],[1440,1520]]){
    block((left+right)/2,348,right-left,50,.035,stone,.025);block((left+right)/2,373,right-left,1,1.9,glass,.985);
    for(const x of [left+3,right-3])block(x,373,1,2,1.95,bronze,.99);
    block((left+right)/2,326,13,10,.025,steel,2.23,walls);block((left+right)/2,320,1,1,.75,steel,1.85,walls);
  }
  toilet(1411,407,-Math.PI/2);toilet(1503,407,-Math.PI/2);
  vanity(1414,463,25,49,true);vanity(1506,463,25,49,true);
  vanity(1233,780,43,25);toilet(1291,772,0);
  // Planters and a small interior plant.
  const leafMat=new T.MeshStandardMaterial({color:'#3d6240',roughness:.95,side:T.DoubleSide});
  function plantLeaf(x:number,z:number,y:number,length:number,width:number,turn:number,lean:number){
    const geometry=new T.PlaneGeometry(1,1,4,12),vertices=geometry.attributes.position;
    for(let i=0;i<vertices.count;i++){const u=vertices.getX(i),v=vertices.getY(i)+.5;vertices.setXYZ(i,u*width*Math.sin(v*Math.PI),v*length,.12*Math.sin(v*Math.PI)-u*u*.12);}
    geometry.computeVertexNormals();const leaf=new T.Mesh(geometry,leafMat);leaf.position.copy(planPoint(x,z,y));leaf.rotation.set(lean,turn,.12*Math.sin(turn));leaf.castShadow=true;leaf.receiveShadow=true;root.add(leaf);
  }
  for(let x=855;x<1130;x+=22){block(x,296,20,22,.24,dark,.16);for(let i=0;i<10;i++)plantLeaf(x+Math.sin(i*2.4)*7,296+Math.cos(i*2.4)*7,.27,.23+(i%3)*.025,.16,i*2.4,.5);}
  const pot=new T.Mesh(new T.CylinderGeometry(.17,.12,.3,20),cream);pot.position.copy(planPoint(1100,335,.15));root.add(pot);
  for(let i=0;i<9;i++)plantLeaf(1100+Math.sin(i)*3,335+Math.cos(i)*3,.23,.48+(i%3)*.11,.24,i*2.4,.25+(i%3)*.2);
  // A pair of framed botanical reliefs echoes the supplied living-room artwork.
  for(const [index,z] of [402,466].entries()){
    block(816,z,1.8,48,1.13,oak,1.72,walls);
    block(817.1,z,1,45,1.07,ceramic,1.72,walls);
    const artGreen=mat(index?'#536957':'#344e40',.95);
    const blade=new T.Mesh(new T.SphereGeometry(1,24,16),artGreen);
    blade.scale.set(.015,.44,.25);blade.position.copy(planPoint(818,z,1.73));blade.rotation.x=index?.25:-.3;walls.add(blade);

  }
  // Full-height pleated sheers at the glazing, visible only inside the apartment.
  const curtainMat=new T.MeshPhysicalMaterial({color:'#f1ece0',roughness:1,transparent:true,opacity:.42,side:T.DoubleSide,depthWrite:false});
  for(const [start,end,z] of [[854,916,324],[1080,1141,324],[1199,1230,324],[1297,1328,324],[1539,1570,324],[1641,1672,324]]){
    const geo=new T.PlaneGeometry((end-start)*TIPO5_SCALE,2.4,24,1),pos=geo.getAttribute('position');for(let i=0;i<pos.count;i++)pos.setZ(i,Math.sin((i%25)/24*Math.PI*10)*.035);geo.computeVertexNormals();const curtain=new T.Mesh(geo,curtainMat);curtain.position.copy(planPoint((start+end)/2,z,1.38));ceiling.add(curtain);
  }
  // A warm cove, recessed spots and sculptural rings above the dining table.
  for(const [x,z,w,d] of [[980,325,310,2],[980,588,310,2],[822,453,2,263],[1137,453,2,263]])block(x,z,w,d,.022,lamp,2.64,ceiling);
  for(const z of [671,716]){const ring=new T.Mesh(new T.TorusGeometry(.25,.017,10,48),bronze);ring.rotation.x=Math.PI/2;ring.position.copy(planPoint(1050,z,2.1));ceiling.add(ring);const glow=new T.Mesh(new T.TorusGeometry(.24,.009,8,48),lamp);glow.rotation.x=Math.PI/2;glow.position.copy(ring.position);glow.position.y-=.017;ceiling.add(glow);block(1050,z,1,1,.6,bronze,2.38,ceiling);}
  // Ceiling lamps only appear inside, preventing floating geometry in the cutaway.
  for(const [x,z] of [[930,414],[1070,414],[930,530],[1070,530],[1050,690],[1240,414],[1610,429],[860,710],[1377,440],[1470,440],[1260,746]]){
    const recess=new T.Mesh(new T.CylinderGeometry(.075,.075,.027,28),black);recess.position.copy(planPoint(x,z,2.69));ceiling.add(recess);
    const trim=new T.Mesh(new T.TorusGeometry(.07,.006,8,32),bronze);trim.rotation.x=Math.PI/2;trim.position.copy(planPoint(x,z,2.674));ceiling.add(trim);
    const lens=new T.Mesh(new T.CylinderGeometry(.057,.057,.012,28),lamp);lens.position.copy(planPoint(x,z,2.672));ceiling.add(lens);
  }
  const lights=[[990,450],[1080,690],[1250,450],[1620,450],[860,700],[1377,440],[1470,440],[1260,746]].map(([x,z])=>{const light=new T.PointLight('#ffdbab',0,7,2);light.position.copy(planPoint(x,z,2.4));root.add(light);return light;});
  root.traverse(o=>{if(o instanceof T.Mesh&&!o.userData.navigation)o.userData.navigation='furniture';});
  const applyFinish=(finish='original')=>{plaster.color.set(finish==='olive'?'#d9ddd0':'#e9e5dc');linen.color.set(finish==='linen'?'#ede2cf':'#eee9df');sage.color.set(finish==='linen'?'#ae9070':finish==='olive'?'#51613c':'#355244');oak.color.set(finish==='olive'?'#a8a08d':finish==='linen'?'#e1c7a4':'#cdc4b4');finishFollowers.forEach(([target,source])=>target.color.copy(source.color));};
  const sectionPlane=new T.Plane(new T.Vector3(0,-1,0),.95);
  const setCutaway=(cut:boolean)=>{sectionPlane.constant=cut?.95:100;root.traverse(o=>{if(o instanceof T.Mesh){for(const material of Array.isArray(o.material)?o.material:[o.material]){material.clippingPlanes=[sectionPlane];material.clipShadows=true;}}});};
  const setDaylight=(hour:number)=>{const evening=Math.max(0,Math.min(1,(hour-16)/5));frost.color.set('#edf2ef').lerp(new T.Color('#647b84'),evening);frost.emissiveIntensity=.23*(1-evening)+.025;};
  return {root,walls,ceiling,lamp,lights,applyFinish,setCutaway,setDaylight,ready:Promise.all(loads),dispose:()=>{disposed=true;extraTextures.forEach(t=>t.dispose());}};
}
