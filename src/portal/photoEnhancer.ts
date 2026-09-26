export interface PreparedPhoto {content:string;width:number;height:number;method:'lanczos3-2x'}
export async function enhancePhoto(listingId:string,photoId:string,version:number,signal:AbortSignal):Promise<PreparedPhoto>{
 const timeout=new AbortController();const timer=setTimeout(()=>timeout.abort(),30000);
 try{
  const response=await fetch('/api/listings/'+listingId+'/prepare-photo',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({sourceId:photoId,version}),signal:AbortSignal.any([signal,timeout.signal])});
  const value=await response.json();if(!response.ok)throw Error(value.error||'Não foi possível preparar a fotografia.');return value;
 }catch(e){if(signal.aborted)throw Error('Preparação cancelada. O original está preservado.');if(timeout.signal.aborted)throw Error('A preparação demorou mais que o esperado. Tente novamente; o original está preservado.');throw e;}finally{clearTimeout(timer);}
}
