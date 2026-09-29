import {validateScene,type SpatialScene} from '../../shared/spatial-scene.mjs';

export type PresentationConfig={version:1;title:string;scene:SpatialScene};
// Export only the approved display configuration. Never serialize a project record.
export function presentationLink(title:string,scene:SpatialScene,origin=location.origin){
 const display:PresentationConfig={version:1,title:title.trim().slice(0,120)||'G400',scene:validateScene(scene)};
 return origin+'/apresentar/cenario#'+encodeURIComponent(JSON.stringify(display));
}
export function readPresentation(hash:string):PresentationConfig{
 if(hash.length>5000)throw Error('Link de apresentação inválido.');
 const data=JSON.parse(decodeURIComponent(hash.slice(1)));
 if(data?.version!==1||typeof data.title!=='string'||!data.title.trim()||data.title.length>120)throw Error('Link de apresentação inválido.');
 return {version:1,title:data.title,scene:validateScene(data.scene)};
}
