type Engine={upscale:(url:string,options:Record<string,unknown>)=>Promise<string>;abort:()=>void;dispose:()=>Promise<void>};
type Runtime=Window&{Upscaler:new(options:Record<string,unknown>)=>Engine;ESRGANSlim2x:Record<string,unknown>;tf:{ready:()=>Promise<void>;getBackend:()=>string}};
let runtime:Promise<void>|undefined;
function script(file:string){return new Promise<void>((resolve,reject)=>{const el=document.createElement('script');el.src='/vendor/photo-v1/'+file;el.onload=()=>resolve();el.onerror=()=>{el.remove();reject(Error('Não foi possível carregar a ferramenta. Confira sua conexão.'));};document.head.append(el);});}
export async function enhancePhoto(url:string,onProgress:(value:number)=>void,signal:AbortSignal){
 const win=window as unknown as Runtime;
 runtime??=(async()=>{if(!win.tf)await script('tf.min.js');if(!win.ESRGANSlim2x)await script('model-config.min.js');if(!win.Upscaler)await script('upscaler.min.js');await win.tf.ready();})().catch(error=>{runtime=undefined;throw error;});
 await runtime;if(signal.aborted)throw Error('Preparação cancelada.');
 const engine=new win.Upscaler({model:{...win.ESRGANSlim2x,path:'/vendor/photo-v1/model.json',packageInformation:undefined}});
 const abort=()=>engine.abort();signal.addEventListener('abort',abort,{once:true});
 try{return await engine.upscale(url,{patchSize:64,padding:6,output:'base64',awaitNextFrame:true,progress:(value:number)=>onProgress(Math.round(value*100))});}
 finally{signal.removeEventListener('abort',abort);await engine.dispose();}
}
