export async function preparePhoto(file:File):Promise<string>{
 if(file.size>8*1024*1024)throw Error('Cada foto pode ter até 8 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>20000000)throw Error('Use fotos de até 20 megapixels.');
  const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
  const context=canvas.getContext('2d');if(!context)throw Error('Não foi possível preparar a foto neste navegador.');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let blob:Blob|null=null;
  for(const quality of [.88,.78,.65,.5]){blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/webp',quality));if(blob&&blob.size<=1900000)break;}
  if(!blob||blob.size>1900000)throw Error('Reduza a resolução desta foto e tente novamente.');
  return await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Não foi possível ler a foto preparada.'));reader.readAsDataURL(blob!);});
 }finally{bitmap.close();}
}
