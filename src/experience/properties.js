import {publicTitle,publicReasons} from '../public-presentation.mjs';
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const currency=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:0,maximumFractionDigits:2}).format(value);
const safeImage=url=>typeof url==='string'&&/^\/api\/photos\/[a-f0-9-]{36}$/.test(url)?url:null;
const blank='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="100%" height="100%" fill="#e4e8dd"/><text x="50%" y="50%" text-anchor="middle" fill="#183e2e" font-family="sans-serif" font-size="28">Fotografia em atualização</text></svg>');
export function mapProperties(rows,assets){
 return rows.filter(p=>p.isIllustrative===false&&typeof p.id==='string'&&p.title&&Number.isFinite(p.price)).map(p=>{
  const facts=[];if(p.area>0)facts.push(['Área informada',p.area.toLocaleString('pt-BR')+' m²']);
  for(const [key,label] of [['bedrooms','Dormitórios'],['suites','Suítes'],['bathrooms','Banheiros'],['parking','Vagas'],['totalArea','Área total'],['yearBuilt','Ano de construção']])if(p[key]!=null)facts.push([label,String(p[key])+(key==='totalArea'?' m²':'')]);
  const sourcePhotos=(p.images||[]).filter(photo=>safeImage(photo.url));
  if(!sourcePhotos.length&&safeImage(p.image))sourcePhotos.push({url:p.image,room:'Apresentação',caption:p.title,width:1200,height:900});
  if(!sourcePhotos.length)sourcePhotos.push({url:blank,room:'Apresentação',caption:'Fotografia em atualização',width:1200,height:900});
  const photos=sourcePhotos.map((photo,index)=>{const asset=p.id+'-'+index;assets[asset]=photo.url;return {asset,name:photo.room||'Ambiente '+(index+1),caption:photo.caption||p.title,width:photo.width||1200,height:photo.height||900};});
  const location=String(p.location||''),place=normalize(location),copy=String(p.description||''),type=String(p.type||''),reasons=publicReasons(p);
  const group=/terreno|lote|terra /i.test(type)?'Terreno':/comercial|loja|galpao|pavilhao|distribuicao/i.test(normalize(type))?'Comercial':type;
  const regionId=place.includes('vacaria')?'vacaria':/palmas|governador celso ramos/.test(place)?'praia-de-palmas':null;
  const summary=[p.area>0?p.area.toLocaleString('pt-BR')+' m²':null,p.bedrooms!=null?p.bedrooms+(p.bedrooms===1?' dormitório':' dormitórios'):null,p.parking!=null?p.parking+(p.parking===1?' vaga':' vagas'):null].filter(Boolean).join(' · ')||type;
  const paragraphs=copy.split(/\n\s*\n/).filter(Boolean);
  const headings=['Integração para viver junto','Conforto nos detalhes','Ambientes que se conectam','Conforto para a rotina','Espaços também lá fora'];
  const highlights=paragraphs.map((text,i)=>[headings[i]||'Mais sobre o imóvel',text]);
  if(!highlights.length)highlights.push(['Sobre este lugar',summary+'. Conheça os detalhes com a equipe.']);
  return {...p,originalPrice:Number.isFinite(p.originalPrice)&&p.originalPrice>p.price?currency(p.originalPrice)+(p.operation==='alugar'?' / mês':''):null,title:publicTitle(p.title),full:publicTitle(p.title),short:publicTitle(p.title),type,group,location,regionId,price:currency(p.price)+(p.operation==='alugar'?' / mês':''),cover:photos[0].asset,photos,summary,facts,lead:reasons[0]||paragraphs[0]||summary,storyTitle:'Um lugar para conhecer. Detalhes para escolher.',highlights,
    dossier:[['Espaços e medidas',facts.map(([k,v])=>k+': '+v).join(' · '),'Solicite a planta e confirme as medidas com a equipe.'],['Localização',location,p.locationProfile||'Converse com a equipe sobre o endereço e o entorno.'],['Condições e próximos passos','Valor anunciado: '+currency(p.price)+(p.operation==='alugar'?' / mês':''),p.costNotes||'Confirme disponibilidade, documentação e condições com a equipe.']],
    searchFacts:{price:p.price,bedrooms:p.bedrooms,parking:p.parking,city:place,features:['patio','lareira','piso aquecido','churrasqueira','suite','piscina'].filter(f=>normalize(copy+' '+(p.tags||[]).join(' ')).includes(f))}};
 });
}
