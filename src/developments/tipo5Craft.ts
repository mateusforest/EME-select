import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Small modeled details, in metres. They share the pilot's materials and disposal. */
export function upholstered(w:number,h:number,d:number,material:T.Material){
 const geometry=new RoundedBoxGeometry(w,h,d,5,Math.min(.075,h*.34));
 const positions=geometry.attributes.position;
 for(let i=0;i<positions.count;i++){
  const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
  const centre=Math.max(0,1-Math.pow(x/(w*.5),4))*Math.max(0,1-Math.pow(z/(d*.5),4));
  positions.setY(i,y+Math.sign(y)*centre*.018+Math.sin(x*16+z*11)*.002);
 }
 geometry.computeVertexNormals();const mesh=new T.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}

export function piping(w:number,d:number,material:T.Material,y=0){
 const r=Math.min(.065,w/5,d/5),points:T.Vector3[]=[];
 for(const [x,z,start] of [[w/2-r,d/2-r,0],[-w/2+r,d/2-r,Math.PI/2],[-w/2+r,-d/2+r,Math.PI],[w/2-r,-d/2+r,Math.PI*1.5]]){
  for(let i=0;i<=8;i++){const a=start+i/8*Math.PI/2;points.push(new T.Vector3(x+Math.cos(a)*r,y,z+Math.sin(a)*r));}
 }
 const curve=new T.CatmullRomCurve3(points,true,'centripetal');return new T.Mesh(new T.TubeGeometry(curve,80,.0035,5,true),material);
}

export function vesselBasin(material:T.Material,metal:T.Material){
 const group=new T.Group();group.name='Cuba com cavidade e válvula';
 const profile=[[.07,0],[.16,.008],[.205,.06],[.225,.135],[.226,.15],[.211,.153],[.205,.132],[.187,.07],[.13,.033],[.027,.032]];
 const shell=new T.Mesh(new T.LatheGeometry(profile.map(([r,y])=>new T.Vector2(r,y)),48),material);shell.castShadow=true;shell.receiveShadow=true;group.add(shell);
 const drain=new T.Mesh(new T.CylinderGeometry(.026,.026,.008,24),metal);drain.position.y=.032;group.add(drain);return group;
}

export function mixer(material:T.Material,height=.28){
 const group=new T.Group(),points=[new T.Vector3(0,0,0),new T.Vector3(0,height*.65,0),new T.Vector3(0,height,-.035),new T.Vector3(0,height,-.11),new T.Vector3(0,height*.73,-.145)];
 const pipe=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points),32,.012,10,false),material);pipe.castShadow=true;group.add(pipe);
 const foot=new T.Mesh(new T.CylinderGeometry(.028,.028,.02,24),material);group.add(foot);
 const handle=new T.Mesh(new T.CylinderGeometry(.009,.009,.075,12),material);handle.rotation.z=-.4;handle.position.set(.031,.09,0);group.add(handle);return group;
}

export function diningChair(wood:T.Material,fabric:T.Material){
 const chair=new T.Group();chair.name='Cadeira estofada com encosto curvo';
 const seat=upholstered(.47,.11,.46,fabric);seat.position.y=.47;chair.add(seat);
 const frame=new T.Mesh(new RoundedBoxGeometry(.46,.055,.43,3,.03),wood);frame.position.y=.405;chair.add(frame);
 for(const [radius,material] of [[.285,wood],[.264,fabric]] as const){
  const back=new T.Mesh(new T.CylinderGeometry(radius+.025,radius,.36,32,3,true,-1.0,2.0),material);back.position.set(0,.725,0);back.castShadow=true;back.receiveShadow=true;chair.add(back);
 }
 for(const x of [-.17,.17])for(const z of [-.16,.16]){
  const leg=new T.Mesh(new T.CylinderGeometry(.024,.017,.41,12),wood);leg.position.set(x,.205,z);leg.rotation.z=-Math.sign(x)*.075;leg.rotation.x=Math.sign(z)*.08;leg.castShadow=true;chair.add(leg);
 }
 return chair;
}
