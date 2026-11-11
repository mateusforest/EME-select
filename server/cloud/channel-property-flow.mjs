import {captureFields,captureValue} from '../../shared/capture.mjs';
import {forms,planSummary,norm} from './channel-tools.mjs';
export const materialsPrompt='Envie fotos (JPG, PNG ou WEBP), documentos PDF ou TXT, até 2 MB por arquivo. Pode colar também um texto com as informações do imóvel.\n\n1 · Revisar e salvar\n2 · Analisar os materiais com IA\n3 · Cancelar\n\nTambém aceito PRONTO ou ANALISAR. Os arquivos ficam privados; só serão anexados ao imóvel após seu SIM.';
export function propertySummary(flow){const base=planSummary({values:Object.fromEntries(Object.entries(flow.values).filter(([k])=>k!=='extracted').map(([k,v])=>[k,typeof v==='string'?v.slice(0,240):v]))});const fields=Object.entries(flow.values.extracted||{}).map(([k,v])=>`${captureFields[k]||k}: ${String(v).slice(0,240)}`).join('\n');return base+(fields?'\n\nDados extraídos para sua revisão:\n'+fields:'')+'\n\nMateriais recebidos: '+(flow.materialIds?.length||0)+(flow.analysisNote?'\n'+flow.analysisNote:'');}
export async function propertyInput({flow,text,media,phone,event,u,tools,ai}){
 const cmd=norm(text);
 if(media){const f=await tools.receiveMaterial(phone,event,flow,u,media);flow.materialIds=[...new Set([...(flow.materialIds||[]),f.id])];flow.confirm=false;
 return `Recebi ${f.filename}. Está reservado para este cadastro.\n\n`+(flow.materialsOpen?materialsPrompt:forms.property[flow.step][1]);}
 if(cmd==='analisar'||(flow.materialsOpen&&!flow.confirm&&cmd==='2')||text.length>140||text.includes('\n')){
  if(cmd!=='analisar'&&cmd!=='2')flow.sourceText=[flow.sourceText,text].filter(Boolean).join('\n').slice(-20000);
  const all=await tools.materials(flow,u),documents=all.filter(f=>f.mime_type==='application/pdf').slice(0,5).map(f=>({id:f.id,filename:f.filename,mimeType:f.mime_type,contentBase64:f.content_base64}));
  const photos=all.filter(f=>f.mime_type==='image/webp').slice(0,4).map(f=>({id:f.id,bytes:Buffer.from(f.content_base64,'base64')}));
  const context=[flow.sourceText,...all.filter(f=>f.mime_type==='text/plain').map(f=>Buffer.from(f.content_base64,'base64').toString('utf8'))].filter(Boolean).join('\n').slice(0,20000);
  try{const {result}=await ai.channelCapture({property:flow.values,documents,photos,context});
   flow.values.extracted||={};for(const f of result.fields){const value=captureValue(f.key,f.value);if(['title','city'].includes(f.key))flow.values[f.key]=value;else flow.values.extracted[f.key]=value;}
   const plain=norm(context);if(/\b(?:tipo\s*:\s*)?apartamento\b/.test(plain))flow.values.type='Apartamento';else if(/\bcasa\b/.test(plain))flow.values.type='Casa';else if(/\bterreno\b/.test(plain))flow.values.type='Terreno urbano';
   if(/\b(?:venda|vender)\b/.test(plain)&&!/\b(?:locacao|alugar|aluguel)\b/.test(plain))flow.values.operation='Venda';else if(/\b(?:locacao|alugar|aluguel)\b/.test(plain)&&!/\b(?:venda|vender)\b/.test(plain))flow.values.operation='Locação';
   flow.analysisNote=(result.pending||[]).slice(0,3).join(' · ')+(all.length>9?' · A análise considera até 5 PDFs e 4 fotos por vez.':'');
   flow.confirm=false;flow.step=forms.property.findIndex(([key])=>flow.values[key]===undefined||flow.values[key]===''&&key!=='owner');
   if(flow.step<0){flow.step=forms.property.length;flow.materialsOpen=true;return 'Extraí os dados para você conferir:\n\n'+propertySummary(flow)+'\n\n'+materialsPrompt;}
   flow.materialsOpen=false;return 'Informações extraídas. Vou pedir somente o que falta.\n\n'+forms.property[flow.step][1];
  }catch(e){flow.confirm=false;return 'O texto e os arquivos foram preservados, mas não consegui concluir a extração. Envie ANALISAR para tentar novamente ou continue preenchendo.\n\n'+(flow.materialsOpen?materialsPrompt:forms.property[Math.min(flow.step,4)][1]);}
 }
 if(flow.materialsOpen&&!flow.confirm){if(['1','pronto','revisar'].includes(cmd)){await tools.prepare(flow,u);flow.confirm=true;return 'Confira o cadastro e os materiais:\n\n'+propertySummary(flow)+'\n\n1 · SIM, salvar no portal\n2 · Cancelar\n\nVocê também pode enviar mais materiais antes de confirmar.';}return materialsPrompt;}
 return null;
}
