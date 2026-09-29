import * as T from 'three';
import {tipo5Outline,TIPO5_SCALE} from './tipo5Navigation';
import {planPoint} from './buildTipo5';

/** Surrounding massing gives the pilot its third-floor context. Adjacent units
 * remain unmodeled; this is a presentation section, not a surveyed BIM model. */
export function buildTipo5BuildingSection(){
 const scale=TIPO5_SCALE/.014;
 const root=new T.Group(),upper=new T.Group(),hall=new T.Group();root.name='G400 · corte no terceiro andar';root.add(upper,hall);root.scale.set(scale,1,scale);
 const ivory=new T.MeshStandardMaterial({color:'#d6d5cb',roughness:.87}),stone=new T.MeshStandardMaterial({color:'#b5b9b2',roughness:.9}),glass=new T.MeshStandardMaterial({color:'#526b6e',roughness:.48,metalness:.2}),wood=new T.MeshStandardMaterial({color:'#9d8061',roughness:.9}),green=new T.MeshStandardMaterial({color:'#66806b',roughness:1});
 const cut=new T.Plane(new T.Vector3(0,-1,0),20),upperMaterials=[ivory,stone,glass,wood,green].map(m=>{const clone=m.clone();clone.clippingPlanes=[cut];return clone;});
 const box=(parent:T.Group,x:number,y:number,z:number,w:number,h:number,d:number,m:T.Material)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.receiveShadow=true;parent.add(mesh);return mesh;};
 const footprint=new T.Shape();footprint.moveTo(-15,3.25);footprint.lineTo(7.4,3.25);footprint.lineTo(7.4,-13);footprint.lineTo(-15,-13);footprint.closePath();
 const court=new T.Path();court.moveTo(-7,-7);court.lineTo(-7,-11);court.lineTo(0,-11);court.lineTo(0,-7);court.closePath();footprint.holes.push(court);
 function floor(y:number,parent:T.Group,high:boolean){
  const mats=high?upperMaterials:[ivory,stone,glass,wood,green],slabGeometry=new T.ExtrudeGeometry(footprint,{depth:.22,bevelEnabled:false});slabGeometry.rotateX(-Math.PI/2);
  const slab=new T.Mesh(slabGeometry,mats[0]);slab.position.y=y-.25;parent.add(slab);
  for(const x of [-12.1,-2.5,4.6]){
   box(parent,x,y+1.32,-3.1,5.2,2.6,.2,mats[2]);box(parent,x,y+1.32,12.8,5.2,2.6,.2,mats[2]);
   for(let i=0;i<6;i++){box(parent,x-2.6+i*1.04,y+1.32,-3.22,.06,2.65,.15,mats[1]);box(parent,x-2.6+i*1.04,y+1.32,12.93,.06,2.65,.15,mats[1]);}
   box(parent,x,y+.18,-3.43,5.3,.28,.45,mats[4]);box(parent,x,y+.18,13.15,5.3,.28,.45,mats[4]);
  }
  for(const x of [-14.8,7.2])for(const z of [-.8,3.5,8,11])box(parent,x,y+1.32,z,.2,2.6,3.3,mats[2]);
  for(const x of [-8.6,1])for(const z of [-3.18,12.91])box(parent,x,y+1.35,z,1.3,2.7,.18,mats[3]);
 }
 floor(-6.4,root,false);floor(-3.2,root,false);
 const selectedSlabGeometry=new T.ExtrudeGeometry(footprint,{depth:.22,bevelEnabled:false});selectedSlabGeometry.rotateX(-Math.PI/2);
 const selectedSlab=new T.Mesh(selectedSlabGeometry,ivory);selectedSlab.position.y=-.25;selectedSlab.receiveShadow=true;root.add(selectedSlab);
 // Ground and podium below the residential levels.
 box(root,-3.8,-10.65,4.8,23.4,7.3,17.2,stone);
 for(const x of [-13,-8,-3,2,6]){box(root,x,-10.3,13.48,3.7,6.3,.08,glass);box(root,x,-10.3,-3.86,3.7,6.3,.08,glass);}
 for(const y of [-14.4,-10.8,-7.05])box(root,-3.8,y,4.8,24,.25,17.8,ivory);
 for(let level=1;level<=4;level++)floor(level*3.2,upper,true);
 box(upper,-3.8,16,4.8,23.6,.3,17.6,upperMaterials[0]);
 // Low cut faces of the adjoining units keep the apartment attached to its floor.
 box(root,-11.1,.34,1.2,7.1,.7,8.7,stone);box(root,-3.8,.34,11.95,22,.7,2,stone);box(root,3.9,.34,8.7,6.9,.7,4.5,stone);
 box(hall,-2.5,-.06,5.15,10.2,.14,2.5,ivory);box(hall,-2.5,1.35,6.35,10.2,2.7,.16,stone);
 box(hall,-7.5,1.35,5.1,.16,2.7,2.5,stone);box(hall,2.5,1.35,5.1,.16,2.7,2.5,stone);
 box(hall,-2.5,2.78,5.15,10.2,.16,2.5,ivory);
 const hallCut=new T.Plane(new T.Vector3(0,-1,0),.7);hall.children.forEach(child=>{const mesh=child as T.Mesh;mesh.material=(mesh.material as T.Material).clone();});
 const points=tipo5Outline.map(([x,z])=>{const p=planPoint(x,z,.025);p.x/=scale;p.z/=scale;return p;});points.push(points[0]);const border=new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#698e70'}));root.add(border);
 const update=(progress:number,inside:boolean)=>{cut.constant=16.3*(1-progress);upper.visible=!inside&&progress<1;root.children.forEach(child=>{if(child!==upper&&child!==hall)child.visible=!inside;});hall.visible=true;hall.children.forEach(child=>{const material=(child as T.Mesh).material as T.Material;material.clippingPlanes=inside?null:[hallCut];});};
 return {root,update};
}
