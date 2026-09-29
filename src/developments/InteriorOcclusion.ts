import {Mesh,type WebGLRenderer,type WebGLRenderTarget} from 'three';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

/** Contact shading only for the closed interior. Transparent panes must not
 * become solid surfaces in the normal buffer; cutaway geometry is excluded. */
export class InteriorOcclusion extends GTAOPass {
 override setSize(width:number,height:number){super.setSize(Math.max(1,Math.round(width*.65)),Math.max(1,Math.round(height*.65)));}
 override render(renderer:WebGLRenderer,writeBuffer:WebGLRenderTarget,readBuffer:WebGLRenderTarget,deltaTime:number,maskActive:boolean){
  const hidden:Mesh[]=[];
  this.scene.traverse(object=>{
   if(!(object instanceof Mesh)||!object.visible)return;
   const materials=Array.isArray(object.material)?object.material:[object.material];
   if(materials.every(material=>material.transparent&&material.opacity<.95)){hidden.push(object);object.visible=false;}
  });
  try{super.render(renderer,writeBuffer,readBuffer,deltaTime,maskActive);}finally{hidden.forEach(object=>object.visible=true);}
 }
}
