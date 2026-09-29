import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { G400_ASSETS } from './g400';

/** Original, illustrative street geometry inspired by the supplied location photos.
 * Local apartment floor is y=0; street height and orientation are approximate.
 * Kept outside the apartment root so it cannot affect walking or the GLB export.
 */
export function buildTipo5Surroundings(){
 const root=new T.Group();root.name='Entorno ilustrativo · piloto 305';
 const groundY=-12.4,materials:T.Material[]=[],batches=new Map<T.Material,T.BufferGeometry[]>();
 const material=(color:string,roughness=.85)=>{const m=new T.MeshStandardMaterial({color,roughness});materials.push(m);return m;};
 const asphalt=material('#53595b'),sidewalk=material('#b6b2a5'),curb=material('#d3cfc2'),grass=material('#657348'),trunk=material('#79644d');
 const greens=['#344d35','#45643e','#536e43'].map(c=>material(c));
 const frame=material('#555b58'),roof=material('#8a8980'),white=material('#ddd9c9'),mark=material('#c9c8b8');
 const facades=['#cfb29b','#b8b6aa','#ddd8c6','#a0a69f','#c2b5a1'].map(c=>material(c));
 const awnings=['#365e4d','#655462','#8a7157'].map(c=>material(c));
 const glazing=material('#65808a',.32);glazing.metalness=.22;
 const litWindow=new T.MeshStandardMaterial({color:'#a1aa9e',emissive:'#ffce8d',emissiveIntensity:0,roughness:.4});materials.push(litWindow);
 const lamp=new T.MeshStandardMaterial({color:'#e4e2c7',emissive:'#ffda9c',emissiveIntensity:0});materials.push(lamp);
 const black=material('#282d2c'),cars=['#e2e0d5','#b3b9b6','#586670','#8e5147'].map(c=>material(c,.32));
 const matrix=new T.Matrix4(),rotation=new T.Quaternion(),scale=new T.Vector3();
 function geometry(g:T.BufferGeometry,m:T.Material,x:number,y:number,z:number,sx=1,sy=1,sz=1,turn=0){
  rotation.setFromAxisAngle(new T.Vector3(0,1,0),turn);matrix.compose(new T.Vector3(x,groundY+y,z),rotation,scale.set(sx,sy,sz));
  g.applyMatrix4(matrix);const list=batches.get(m)||[];list.push(g);batches.set(m,list);
 }
 function box(x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material,turn=0){geometry(new T.BoxGeometry(w,h,d),m,x,y,z,1,1,1,turn);}
 function cylinder(x:number,y:number,z:number,r:number,h:number,m:T.Material){geometry(new T.CylinderGeometry(r*.78,r,h,8),m,x,y,z);}
 function line(a:T.Vector3,b:T.Vector3,r:number,m:T.Material){
  const delta=b.clone().sub(a),g=new T.CylinderGeometry(r,r,delta.length(),6),q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());
  g.applyMatrix4(new T.Matrix4().compose(a.clone().add(b).multiplyScalar(.5).add(new T.Vector3(0,groundY,0)),q,new T.Vector3(1,1,1)));
  const list=batches.get(m)||[];list.push(g);batches.set(m,list);
 }
 box(0,-.18,0,360,.3,360,grass);
 box(0,0,-19,300,.08,20,asphalt);box(-15,.005,20,13,.08,145,asphalt);
 box(0,.08,-6.7,300,.16,4.4,sidewalk);box(0,.08,-31.4,300,.16,4.4,sidewalk);
 box(-24.1,.08,22,4,.16,120,sidewalk);box(-6.5,.08,34,3,.16,90,sidewalk);
 // Divided avenue and planted median, interrupted at the intersection.
 for(const [x,w] of [[-75,94],[62,126]]){box(x,.16,-19,w,.3,2.8,curb);box(x,.32,-19,w-.2,.05,2.55,grass);}
 for(let x=-130;x<145;x+=8){if(Math.abs(x+15)<11)continue;box(x,.06,-24,3,.025,.12,mark);box(x,.06,-14,3,.025,.12,mark);}
 for(const z of [-10,-28])for(let i=0;i<11;i++)box(-21+i*1.15,.07,z,.65,.025,3.1,white);
 for(let i=0;i<14;i++)box(-27,.07,-27+i*1.2,3,.025,.65,white);
 // Shallow curb joints give scale to the view down from the third floor.
 for(let x=-70;x<90;x+=2.5){box(x,.17,-6.7,.025,.015,4.2,curb);box(x,.17,-31.4,.025,.015,4.2,curb);}
 function building(x:number,z:number,w:number,d:number,h:number,index:number,turn=0){
  const m=facades[index%facades.length];box(x,h/2+.2,z,w,h,d,m,turn);box(x,h+.27,z,w+.25,.22,d+.25,roof,turn);
  const local=(lx:number,ly:number,lz:number,bw:number,bh:number,bd:number,mat:T.Material)=>box(x+Math.cos(turn)*lx+Math.sin(turn)*lz,ly,z-Math.sin(turn)*lx+Math.cos(turn)*lz,bw,bh,bd,mat,turn);
  const bays=Math.max(2,Math.floor(w/2.7));
  for(let floor=0;floor<Math.floor(h/3);floor++){
   for(let i=0;i<bays;i++){
    const wx=-w/2+(i+.5)*w/bays,wy=1.75+floor*3;
    local(wx,wy,d/2+.035,1.42,1.7,.09,frame);
    local(wx,wy,d/2+.1,1.26,1.53,.05,(i+floor+index)%4===0?litWindow:glazing);
    local(wx,wy,d/2+.14,.045,1.53,.035,white);
    local(wx,wy-.94,d/2+.24,1.7,.1,.38,white);
   }
   if(floor>0)local(0,floor*3+.18,d/2+.12,w,.13,.25,white);
  }
  if(h<10){local(0,2.85,d/2+.28,w-.3,.5,.4,awnings[index%3]);local(0,3.17,d/2+.55,w-.1,.12,1.1,white);}
  else for(let floor=1;floor<Math.floor(h/3);floor++)for(const side of [-1,1]){
   local(side*w*.32,floor*3+.25,d/2+.65,w*.28,.17,1.4,white);
   local(side*w*.32,floor*3+.8,d/2+1.25,w*.28,.95,.08,glazing);
  }
 }
 building(1,-39,17,11,7.5,0);building(21,-39,17,11,5.8,2);building(41,-39,18,12,12,3);
 building(-36,-40,21,13,15,1);building(-62,-40,21,13,9,4);
 for(let i=0;i<5;i++){building(67+i*23,-40,19,13,6+(i%3)*3,i);building(-91-i*24,-41,20,14,6+(i%4)*3,i+1);}
 // Side street: repeated tall arched openings recall the neighboring stone building.
 box(-34,4.6,10,14,9.2,37,facades[1]);box(-34,9.35,10,14.3,.3,37.3,roof);
 for(let i=0;i<9;i++){
  const z=-5+i*3.7;
  box(-26.93,3.5,z,.12,5.8,2.8,glazing);box(-26.81,1.05,z,.14,.3,2.8,curb);
  box(-26.81,4,z,.14,.09,2.8,white);box(-26.81,3.7,z,.14,6.4,.06,white);
  const arch=new T.TorusGeometry(1.47,.16,6,22,Math.PI);arch.rotateY(Math.PI/2);geometry(arch,facades[4],-26.7,6.4,z);
  box(-26.7,3.1,z-1.52,.22,6.2,.22,facades[4]);
 }
 for(let i=0;i<5;i++){building(-35,39+i*19,14,15,6+(i%2)*3,i,-Math.PI/2);building(17,-64-i*19,23,14,7+(i%3)*3,i);}
 function palm(x:number,z:number,height:number){
  cylinder(x,height/2,z,.19,height,trunk);
  for(let i=0;i<9;i++){
   const a=i*Math.PI*2/9,points=[];
   for(let k=0;k<6;k++){const t=k/5,r=t*3.2;points.push(new T.Vector3(x+Math.cos(a)*r,height+.4+Math.sin(t*Math.PI)*.7-t*t*1.7,z+Math.sin(a)*r));}
   for(let k=1;k<points.length;k++)line(points[k-1],points[k],.035,greens[0]);
   for(let k=1;k<6;k++){
    const p=points[k],g=new T.SphereGeometry(1,6,4);geometry(g,greens[i%3],p.x,p.y,p.z,.22,.07,.85,a+Math.PI/2);
   }
  }
 }
 function araucaria(x:number,z:number,height:number){
  cylinder(x,height/2,z,.33,height,trunk);
  for(let tier=0;tier<3;tier++)for(let i=0;i<7;i++){
   const a=i*Math.PI*2/7+tier*.4,r=3.3-tier*.55,y=height-3+tier*1.15;
   line(new T.Vector3(x,y-1,z),new T.Vector3(x+Math.cos(a)*r,y,z+Math.sin(a)*r),.11,trunk);
   geometry(new T.SphereGeometry(1,8,6),greens[(tier+i)%3],x+Math.cos(a)*r,y+.35,z+Math.sin(a)*r,1.65,.72,1.65);
  }
 }
 for(const x of [-83,-55,-32,10,36,62,88])palm(x,-19,9.5+(x%3)*.25);
 for(const [x,z,h] of [[-25,-39,17],[-26,28,16],[60,-42,15],[-54,30,14]])araucaria(x,z,h);
 for(let i=0;i<19;i++){const x=-95+i*10;geometry(new T.SphereGeometry(1,8,5),greens[i%3],x,.68,-19,1.2,.55,.85);}
 // A few parked vehicles and street lamps, all fixed scenery with no navigation hits.
 function car(x:number,z:number,index:number,turn=0){
  box(x,.62,z,1.75,.62,4,cars[index%4],turn);box(x,1.12,z-.1,1.48,.54,2.05,glazing,turn);
  for(const dx of [-.83,.83])for(const dz of [-1.22,1.22])box(x+Math.cos(turn)*dx+Math.sin(turn)*dz,.36,z-Math.sin(turn)*dx+Math.cos(turn)*dz,.2,.6,.63,black,turn);
  for(const sign of [-1,1])box(x+sign*.53,.62,z+2.02,.4,.15,.035,lamp,turn);
 }
 for(const [x,z,i,t] of [[-5,-28,0,Math.PI/2],[17,-28,1,Math.PI/2],[35,-28,2,Math.PI/2],[-42,-10,0,-Math.PI/2],[50,-10,3,-Math.PI/2],[-19,14,1,0]])car(x,z,i,t);
 for(const x of [-55,-6,42,86]){
  cylinder(x,4.3,-31,.065,8.6,frame);line(new T.Vector3(x,8.6,-31),new T.Vector3(x,9.1,-27.5),.055,frame);box(x,9.1,-27.5,.45,.1,1.1,lamp);
 }
 // Merge static meshes per material: the neighborhood adds a few dozen draw calls.
 for(const [m,parts] of batches){const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());if(!merged)continue;const mesh=new T.Mesh(merged,m);mesh.receiveShadow=false;mesh.name='Entorno · '+m.uuid;root.add(mesh);}
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{top:{value:new T.Color('#779db9')},horizon:{value:new T.Color('#dce5e3')}},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'uniform vec3 top;uniform vec3 horizon;varying vec3 v;void main(){float h=smoothstep(-.04,.65,normalize(v).y);gl_FragColor=vec4(mix(horizon,top,h),1.);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}'});
 const sky=new T.Mesh(new T.SphereGeometry(220,32,16),skyMat);sky.position.y=groundY;root.add(sky);
 // An original illustrated panorama replaces the fallback geometry when loaded.
 // A finite curved backdrop gives gentle parallax without becoming a walkable area.
 const fallback=[...root.children],panoramaMaterial=new T.MeshBasicMaterial({side:T.BackSide,toneMapped:false});
 const panorama=new T.Mesh(new T.CylinderGeometry(70,70,55,128,1,true),panoramaMaterial);
 panorama.position.y=-3.9;panorama.rotation.y=-.35;panorama.visible=false;panorama.name='Panorama ilustrativo da vizinhança';root.add(panorama);
 let disposed=false;
 const ready=new Promise<void>(resolve=>new T.TextureLoader().load(G400_ASSETS+'surroundings/vacaria-illustrative-day.png',texture=>{
  if(disposed){texture.dispose();resolve();return;}
  texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=4;panoramaMaterial.map=texture;panoramaMaterial.needsUpdate=true;
  fallback.forEach(object=>object.visible=false);panorama.visible=true;root.userData.panorama='ready';resolve();
 },undefined,()=>{root.userData.panorama='fallback';resolve();}));
 const update=(hour:number)=>{const t=Math.max(0,Math.min(1,(hour-16)/5));skyMat.uniforms.top.value.set('#779db9').lerp(new T.Color('#101b32'),t);skyMat.uniforms.horizon.value.set(hour>=17?'#c6ad95':'#dce5e3').lerp(new T.Color('#344452'),t);litWindow.emissiveIntensity=t*1.6;lamp.emissiveIntensity=t*2.2;panoramaMaterial.color.set(hour>=17?'#ffe6c7':'#ffffff').lerp(new T.Color('#263951'),t);};
 return {root,update,groundY,ready,dispose:()=>{disposed=true;}};
}
