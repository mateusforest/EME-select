export async function preparePhoto(file:File, generated=false):Promise<string>{
 if(!generated&&file.size>8*1024*1024)throw Error('Cada foto pode ter até 8 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>20000000)throw Error('Use fotos de até 20 megapixels.');
  const canvas=document.createElement('canvas');
  const context=canvas.getContext('2d');if(!context)throw Error('Não foi possível preparar a foto neste navegador.');
  let blob:Blob|null=null;
  for(const edge of [3200,2800,2400]){
   const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height));
   canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.94,.9,.86]){blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=1900000)break;}
   if(blob&&blob.size<=1900000)break;
  }
  if(!blob||blob.size>1900000)throw Error('Esta foto é muito pesada para manter boa qualidade. Exporte o original em JPEG com até 3200 pixels no lado maior e tente novamente.');
  return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Não foi possível ler a foto preparada.'));reader.readAsDataURL(blob!);});
 }finally{bitmap.close();}
}
