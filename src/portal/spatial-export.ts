import type {SpatialScene} from '../../shared/spatial-scene.mjs';
export function downloadBlob(blob:Blob,name:string){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
export async function exportSpatialModel(config:SpatialScene){
 if(config.mode!=='tipo5')throw new Error('Selecione o piloto Tipo 5 para exportar o modelo.');
 const [{buildTipo5},{GLTFExporter},T]=await Promise.all([import('../developments/buildTipo5'),import('three/addons/exporters/GLTFExporter.js'),import('three')]);
 const model=buildTipo5();
 try{
  await model.ready;model.applyFinish(config.finish);model.ceiling.visible=false;
  model.lights.forEach(l=>l.intensity=4+Math.max(0,Math.min(1,(config.hour-16)/4))*16);
  model.root.name='EME Spatial - G400 Tipo 5 - estudo conceitual';
  model.root.userData={source:'Planta comercial G400 Tipo 5',status:'Geometria conceitual; medidas e alturas a validar',configuration:config};
  const bytes=await new GLTFExporter().parseAsync(model.root,{binary:true,onlyVisible:true});
  downloadBlob(new Blob([bytes as ArrayBuffer],{type:'model/gltf-binary'}),'EME-Spatial-G400-Tipo-5.glb');
 }finally{
  model.dispose();const geometries=new Set<any>(),materials=new Set<any>(),textures=new Set<any>();
  model.root.traverse(o=>{if(o instanceof T.Mesh){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material]){materials.add(m);Object.values(m).forEach(v=>{if(v instanceof T.Texture)textures.add(v);});}}});
  geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
 }
}
