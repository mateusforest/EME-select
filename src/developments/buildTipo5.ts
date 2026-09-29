import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const planPoint=(x:number,z:number,y=0)=>new T.Vector3((x-1200)*.014,y,(z-530)*.014);

/** Conceptual geometry traced from the commercial Tipo 5 sheet. No measured heights. */
export function buildTipo5(){
  const root=new T.Group(),walls=new T.Group(),ceiling=new T.Group();
  root.add(walls,ceiling);
  const mat=(color:string,roughness=.75)=>new T.MeshStandardMaterial({color,roughness});
  const plaster=mat('#eee9df'),cream=mat('#ded8c8'),linen=mat('#eee7d8'),sage=mat('#687568'),dark=mat('#253e36'),bronze=mat('#927554',.35),stone=mat('#e9e3d7',.38),black=mat('#252b29',.4),ceramic=mat('#faf7ed',.2);
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
  const glass=new T.MeshPhysicalMaterial({color:'#b7d1cf',transparent:true,opacity:.17,roughness:.1,metalness:.1,depthWrite:false,side:T.DoubleSide});
  const lamp=new T.MeshStandardMaterial({color:'#fff1cf',emissive:'#ffd697',emissiveIntensity:0,roughness:.3});
  function block(x:number,z:number,w:number,d:number,h:number,m:T.Material,y=h/2,group=root,round=0){
    const g=round?new RoundedBoxGeometry(w*.014,h,d*.014,2,Math.min(round,h/3,w*.004,d*.004)):new T.BoxGeometry(w*.014,h,d*.014);
    const mesh=new T.Mesh(g,m);mesh.position.copy(planPoint(x,z,y));mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
  }
  const outline=[[810,308],[1155,308],[1155,285],[1525,285],[1525,315],[1700,315],[1700,615],[1430,615],[1430,690],[1390,690],[1390,800],[700,800],[700,610],[810,610]];
  const shape=new T.Shape();outline.forEach(([x,z],i)=>{const p=planPoint(x,z);if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});shape.closePath();
  const slabGeometry=new T.ExtrudeGeometry(shape,{depth:.18,bevelEnabled:false});slabGeometry.rotateX(-Math.PI/2);
  const slab=new T.Mesh(slabGeometry,tile);slab.position.y=-.18;slab.receiveShadow=true;slab.castShadow=true;root.add(slab);
  // Wood floor in the intimate wing; the public circulation remains in stone.
  block(1250,451,185,275,.012,oak,.01);block(1607,465,180,285,.012,oak,.01);block(1288,620,280,100,.012,oak,.01);
  const ceilingMesh=new T.Mesh(new T.ShapeGeometry(shape),plaster);ceilingMesh.rotation.x=Math.PI/2;ceilingMesh.position.y=2.72;ceiling.add(ceilingMesh);
  function wall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1);const mesh=block((x1+x2)/2,(z1+z2)/2,width,10,2.7,plaster,1.35,walls);mesh.rotation.y=-Math.atan2(z2-z1,x2-x1);
    const skirting=block((x1+x2)/2,(z1+z2)/2,width,11,.09,cream,.045,walls);skirting.rotation.y=mesh.rotation.y;
  }
  function windowWall(x1:number,z1:number,x2:number,z2:number){
    const width=Math.hypot(x2-x1,z2-z1),angle=-Math.atan2(z2-z1,x2-x1);
    for(const [h,y,m] of [[.25,.125,plaster],[.17,2.615,plaster],[2.28,1.39,glass]] as const){const b=block((x1+x2)/2,(z1+z2)/2,width,5,h,m,y,walls);b.rotation.y=angle;}
    const count=Math.ceil(width/40);
    for(let i=0;i<=count;i++)block(x1+(x2-x1)*i/count,z1+(z2-z1)*i/count,2,3,2.38,bronze,1.38,walls);
  }
  windowWall(820,315,1150,315);windowWall(810,325,810,595);
  windowWall(1165,315,1335,315);windowWall(1525,322,1690,322);
  wall(1155,285,1525,285);wall(1700,315,1700,615);wall(1430,615,1700,615);
  wall(1430,615,1430,690);wall(1390,690,1430,690);wall(1390,690,1390,800);
  wall(700,800,1120,800);wall(1190,800,1390,800);wall(700,610,700,800);wall(700,610,810,610);wall(810,595,810,610);
  // Door gaps follow the visible plan. Heights and thicknesses are estimates.
  wall(1155,315,1155,535);wall(1155,590,1155,610);
  wall(1155,570,1275,570);wall(1330,570,1345,570);
  wall(1345,315,1345,570);wall(1430,315,1430,510);wall(1345,500,1390,500);wall(1420,500,1430,500);
  wall(1515,315,1515,545);wall(1515,590,1515,615);
  wall(1430,500,1470,500);wall(1500,500,1515,500);
  wall(1220,700,1390,700);wall(1220,700,1220,735);wall(1220,780,1220,800);
  wall(810,610,810,655);wall(810,720,810,800);
  // Furniture is a restrained interpretation of the furnished plan, not a specification.
  block(970,440,255,220,.025,cream,.028);
  block(940,353,180,53,.38,linen,.29,root,.1);block(852,424,50,155,.38,linen,.29,root,.1);
  block(940,329,180,13,.52,linen,.5,root,.06);block(830,420,14,163,.52,linen,.5,root,.06);
  for(let i=0;i<3;i++)block(880+i*53,350,46,37,.12,linen,.52,root,.05);
  for(let i=0;i<2;i++)block(850,398+i*52,37,45,.12,linen,.52,root,.05);
  block(990,350,27,20,.25,sage,.67,root,.06);block(850,465,22,28,.24,sage,.65,root,.05);
  block(980,460,76,48,.14,oak,.35,root,.06);block(980,460,48,26,.29,dark,.15);
  block(1125,440,15,150,.35,oak,.3);block(1136,430,4,78,.71,black,1.12);
  // Kitchen in the lower left of the plan.
  block(882,781,122,30,.83,oak,.415);block(882,781,128,34,.045,stone,.86);
  block(829,746,28,66,.83,oak,.415);block(829,746,32,70,.045,stone,.86);
  block(945,665,42,65,2.12,cream,1.06);block(907,675,37,47,.83,oak,.415);block(907,675,40,50,.045,stone,.86);
  block(826,745,23,34,.022,black,.9);for(const z of [735,755])for(const x of [820,832]){const burner=new T.Mesh(new T.TorusGeometry(.055,.006,6,18),bronze);burner.rotation.x=Math.PI/2;burner.position.copy(planPoint(x,z,.92));root.add(burner);}
  block(860,780,28,16,.03,black,.89);block(860,780,24,12,.025,ceramic,.91);
  block(883,774,3,3,.27,bronze,1.03);
  for(let i=0;i<3;i++)block(837+i*35,797,1,2,.73,bronze,.4);
  // Rectangular dining table and six upholstered chairs.
  block(1070,686,56,125,.09,oak,.8,root,.035);
  for(const z of [641,730])block(1070,z,30,10,.74,dark,.37);
  function chair(x:number,z:number,angle:number){
    const group=new T.Group();group.position.copy(planPoint(x,z));group.rotation.y=angle;root.add(group);
    const seat=new T.Mesh(new RoundedBoxGeometry(.43,.12,.43,2,.045),linen);seat.position.y=.46;seat.castShadow=true;group.add(seat);
    const back=new T.Mesh(new RoundedBoxGeometry(.43,.42,.085,2,.035),sage);back.position.set(0,.69,.22);back.castShadow=true;group.add(back);
    for(const sx of [-.16,.16])for(const sz of [-.16,.16]){const leg=new T.Mesh(new T.CylinderGeometry(.016,.012,.4,6),bronze);leg.position.set(sx,.2,sz);group.add(leg);}
  }
  for(const z of [651,687,723]){chair(1020,z,Math.PI/2);chair(1120,z,-Math.PI/2);}
  // Beds, fitted wardrobes and bedside tables in both suites.
  function bed(x:number,z:number){
    block(x,z+25,130,185,.018,cream,.025);
    block(x,z,115,150,.3,oak,.2,root,.06);block(x,z,113,148,.22,linen,.45,root,.08);
    block(x,z+29,115,87,.055,sage,.585,root,.025);
    block(x,z-78,130,9,1.05,oak,.56,root,.04);
    for(const dx of [-27,27])block(x+dx,z-47,45,29,.14,linen,.63,root,.06);
    for(const dx of [-78,78])block(x+dx,z-58,29,32,.38,oak,.24,root,.035);
  }
  bed(1240,414);bed(1610,429);
  block(1250,552,132,26,2.35,cream,1.175);block(1680,560,27,80,2.35,cream,1.175);
  for(const x of [1200,1240,1280])block(x,567,1,1,1.75,bronze,1.25);
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
  // Ceiling lamps only appear inside, preventing floating geometry in the cutaway.
  for(const [x,z] of [[970,440],[1070,686],[1240,414],[1610,429],[880,720]])block(x,z,45,7,.04,lamp,2.66,ceiling,.01);
  const lights=[[990,450],[1080,690],[1250,450],[1620,450],[860,700]].map(([x,z])=>{const light=new T.PointLight('#ffdbab',0,7,2);light.position.copy(planPoint(x,z,2.4));root.add(light);return light;});
  return {root,walls,ceiling,lamp,lights};
}
