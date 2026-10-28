import {useState,type FormEvent} from 'react';
import {Check,FileUp} from 'lucide-react';
import {api} from './api';

type Offer={ref:string;title:string;city:string;propertyType:string;priceCents:number;url:string;available:boolean};
type Props={onImported:()=>void};
function parseCsv(raw:string){
  // RFC4180-style quoted strings, separators ; or ,; line breaks inside quoted fields.
  const separator=(raw.split(/\r?\n/)[0].match(/;/g)||[]).length>(raw.split(/\r?\n/)[0].match(/,/g)||[]).length?';':',';
  const table:string[][]=[];let row:string[]=[],cell='',quoted=false;
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(ch==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
    else if(!quoted&&ch===separator){row.push(cell.trim());cell='';}
    else if(!quoted&&(ch==='\n'||ch==='\r')){if(ch==='\r'&&raw[i+1]==='\n')i++;row.push(cell.trim());cell='';if(row.some(Boolean))table.push(row);row=[];}
    else cell+=ch;
  }
  if(quoted)throw Error('CSV com aspas não fechadas.');
  row.push(cell.trim());if(row.some(Boolean))table.push(row);
  return table;
}
function offersFromCsv(raw:string):Offer[]{
  const rows=parseCsv(raw);if(rows.length<2)throw Error('Inclua cabeçalho e pelo menos um imóvel.');
  const fields=['ref','title','city','propertyType','price','url','available'];
  const header=rows[0].map(v=>v.replace(/^\ufeff/,'').trim().toLowerCase());
  const aliases:Record<string,string[]>={
    ref:['ref','referencia','referência','codigo','código'],
    title:['title','titulo','título','imovel','imóvel'],
    city:['city','cidade','municipio','município'],
    propertyType:['propertytype','tipo','tipoimovel','tipo_imovel'],
    price:['price','preco','preço','valor'],
    url:['url','link','anuncio','anúncio'],
    available:['available','disponivel','disponível','ativo']
  };
  const cols=fields.map(f=>header.findIndex(x=>aliases[f].includes(x.replace(/\s+/g,''))));
  if(cols.some(x=>x<0))throw Error('Cabeçalhos necessários: referencia;titulo;cidade;tipo;preco;url;disponivel.');
  if(rows.length>1001)throw Error('Envie até 1.000 imóveis por arquivo.');
  return rows.slice(1).map((values,index)=>{
    if(values.length!==header.length)throw Error('Confira as colunas da linha '+(index+2)+'.');
    const get=(name:string)=>values[cols[fields.indexOf(name)]]?.trim()||'';
    // O preço no CSV deve ser numérico em reais: 450000 ou 450000.00; sem pontos de milhar.
    const priceString=get('price').replace(',','.');
    const price=Number(priceString);
    if(!/^\d+(?:\.\d{1,2})?$/.test(priceString)||!Number.isFinite(price))throw Error('Preço inválido na linha '+(index+2)+'. Use 450000 ou 450000.00.');
    const availability=get('available').toLowerCase();
    if(!['sim','não','nao','yes','no','true','false','1','0'].includes(availability))throw Error('Disponibilidade inválida na linha '+(index+2)+'. Use sim/não.');
    return {ref:get('ref'),title:get('title'),city:get('city'),propertyType:get('propertyType'),
      priceCents:Math.round(price*100),url:get('url'),available:['sim','yes','true','1'].includes(availability)};
  });
}
export default function SwitchPartnerImport({onImported}:Props){
 const [partner,setPartner]=useState(''),[file,setFile]=useState<File|null>(null),[authorized,setAuthorized]=useState(false);
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[error,setError]=useState('');
 async function submit(e:FormEvent){
  e.preventDefault();if(!file||!authorized||busy)return;
  setBusy(true);setNotice('');setError('');
  try{
    if(file.size>200000)throw Error('Arquivo grande demais (máximo de 200 KB).');
    const offers=offersFromCsv(await file.text());let imported=0;
    // A API permite até 100 itens por lote; dados permanecem privados.
    for(let i=0;i<offers.length;i+=100){
      const batch=offers.slice(i,i+100);
      await api('/switch/partners/import','POST',{partner:partner.trim(),authorizationConfirmed:true,offers:batch});
      imported+=batch.length;
      setNotice(imported+' de '+offers.length+' imóveis importados…');
    }
    setNotice(imported+' imóveis recebidos de '+partner.trim()+'. Confira as combinações antes de oferecer.');
    onImported();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 return <details className="sx-partner-import"><summary><FileUp size={16}/> Importar carteira autorizada de parceiro (CSV)</summary>
   <p className="sx-info">Receba planilhas de construtoras e imobiliárias com autorização por escrito, sem copiar anúncios de terceiros nem importar contatos pessoais. Um CSV pode alimentar centenas de imóveis de uma vez.</p>
   <form onSubmit={submit} className="sx-editor">
     <label>Nome do parceiro<input required minLength={3} maxLength={100} value={partner} onChange={e=>setPartner(e.target.value)} placeholder="Construtora ou imobiliária parceira"/></label>
     <label>Carteira CSV (até 1.000 imóveis)<input type="file" required accept=".csv,text/csv,text/plain" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
     <small className="sx-info">Cabeçalho: referencia;titulo;cidade;tipo;preco;url;disponivel. Use preço em reais (450000), tipo Casa/Apartamento e disponibilidade sim/não. Reimportar a mesma referência atualiza o imóvel; para retirar, marque não.</small>
     <label className="sx-check"><input type="checkbox" required checked={authorized} onChange={e=>setAuthorized(e.target.checked)}/> Confirmo que tenho autorização escrita para compartilhar estas ofertas e seus links com a M Select.</label>
     {notice&&<p role="status" className="sx-info">{notice}</p>}{error&&<p role="alert" className="pt-error">{error}</p>}
     <button type="submit" className="ps-button ps-button--primary" disabled={busy||!file||!authorized}>{busy?'Importando…':'Importar carteira'}<Check size={16}/></button>
   </form>
 </details>;
}
