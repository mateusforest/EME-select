import {leadFail,leadId,leadPhone} from './leads.mjs';

export const buyerChannels={whatsapp:'WhatsApp',instagram:'Instagram',referral:'Indicação',network:'Contato pessoal',email:'E-mail',facebook:'Facebook',site:'Site'};
export const buyerEnums={operation:{'':'A definir',comprar:'Comprar',alugar:'Alugar'},propertyType:{'':'A definir',Casa:'Casa',Apartamento:'Apartamento',Terreno:'Terreno',Comercial:'Comercial'},purpose:{'':'A definir',home:'Morar',investment:'Investir'},timeline:{'':'A definir',now:'Até 30 dias',quarter:'Até 3 meses',semester:'Até 6 meses',exploring:'Ainda explorando'},payment:{'':'A definir',cash:'Recursos próprios',financing:'Financiamento',exchange:'Parte em permuta'},whatsappUpdates:{unknown:'Não autorizado ainda',granted:'Autorizou novidades',declined:'Não receber novidades'},emailUpdates:{unknown:'Não autorizado ainda',granted:'Autorizou novidades',declined:'Não receber novidades'},contactPermission:{unknown:'Ainda não confirmado',granted:'Contato autorizado',declined:'Não deseja contato'}};
export function emptyBuyer(){return {operation:'',city:'',neighborhood:'',propertyType:'',budgetMax:null,bedrooms:null,purpose:'',timeline:'',payment:'',essentials:'',email:'',whatsappUpdates:'unknown',emailUpdates:'unknown',contactPermission:'unknown'};}
export function profileForLead(lead){return buyerProfile(lead.data.qualification?.profile||{contactPermission:lead.data.consentVersion==='select-contact-2026-10'?'granted':'unknown'});}
export function buyerEmail(value=''){if(typeof value!=='string'||value.length>254||(value.trim()&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())))leadFail(400,'Confira o e-mail informado.');return value.trim().toLowerCase();}
export function buyerProfile(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!Object.hasOwn(emptyBuyer(),k)))leadFail(400,'Confira os campos do perfil de busca.');
 const p={...emptyBuyer(),...input};
 for(const [key,options]of Object.entries(buyerEnums))if(!Object.hasOwn(options,p[key]))leadFail(400,'Confira as preferências de busca.');
 for(const [key,max]of [['city',100],['neighborhood',140],['essentials',1000]]){if(typeof p[key]!=='string'||p[key].length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(p[key]))leadFail(400,'Reduza ou confira o texto das preferências.');p[key]=p[key].trim();}
 for(const [key,max]of [['budgetMax',1e10],['bedrooms',30]])if(p[key]!==null&&(typeof p[key]!=='number'||!Number.isFinite(p[key])||p[key]<0||p[key]>max||key==='bedrooms'&&!Number.isInteger(p[key])||key==='budgetMax'&&(p[key]===0||Math.abs(p[key]*100-Math.round(p[key]*100))>.001)))leadFail(400,'Confira valor e dormitórios.');
 p.email=buyerEmail(p.email);
 return p;
}
export function buyerIntake(input){
 if(!input||Object.keys(input).some(k=>!['requestId','name','phone','email','channel','sourceDetail','message','contactPermission'].includes(k)))leadFail(400,'Confira o novo contato.');
 const bounded=(key,min,max)=>{if(typeof input[key]!=='string'||input[key].trim().length<min||input[key].length>max)leadFail(400,'Confira nome, origem e mensagem.');return input[key].trim();};
 if(!Object.hasOwn(buyerChannels,input.channel)||!Object.hasOwn(buyerEnums.contactPermission,input.contactPermission))leadFail(400,'Confira canal e autorização de contato.');
 return {requestId:leadId(input.requestId),data:{name:bounded('name',2,100),phone:leadPhone(input.phone),message:bounded('message',0,1500),interest:'Busca de imóvel',intent:'contact',visit:{date:'',period:'',time:''},source:{page:'/acesso-select/equipe/leads',origin:input.channel,medium:'manual',campaign:bounded('sourceDetail',0,150)},qualification:{profile:{...emptyBuyer(),email:buyerEmail(input.email),contactPermission:input.contactPermission}}}};
}
export function buyerReadiness(profile,lead,now=Date.now()){
 const p=buyerProfile(profile||{}),missing=[['operation','compra ou locação'],['city','região'],['propertyType','tipo de imóvel'],['budgetMax','faixa de valor'],['timeline','prazo']].filter(([key])=>p[key]===null||p[key]==='').map(([,label])=>label);
 const closed=['won','lost'].includes(lead.status),overdue=!closed&&lead.next_contact_at&&Date.parse(lead.next_contact_at)<now;
 let nextAction='Completar '+(missing[0]||'os próximos passos')+'.',label='Conhecer a busca',priority=1;
 if(p.contactPermission==='declined')return {missing,complete:5-missing.length,total:5,label:'Contato suspenso',priority:0,nextAction:'Respeitar a preferência de não receber contato.'};
 if(closed)return {missing,complete:5-missing.length,total:5,label:'Atendimento encerrado',priority:0,nextAction:'Consulte o histórico deste atendimento.'};
 if(p.contactPermission!=='granted'){nextAction='Confirmar autorização antes de abordar este contato.';label='Confirmar contato';priority=1;}
 else if(overdue){label='Retorno atrasado';nextAction='Retomar o contato combinado.';priority=4;}
 else if(lead.data?.intent==='visit'){label='Pedido de visita';nextAction='Conferir interesse e disponibilidade real para a visita.';priority=3;}
 else if(!missing.length){label='Busca definida';nextAction='Revisar imóveis compatíveis e apresentar a seleção.';priority=2;}
 return {missing,complete:5-missing.length,total:5,label,priority,nextAction};
}
const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const samePlace=(text,place)=>String(text||'').split(/[·,|]/).some(part=>norm(part.replace(/\s*[-/]\s*[A-Z]{2}\s*$/,''))===norm(place));
export function matchBuyer(profile,catalog){
 const p=buyerProfile(profile),missing=[];
 if(!p.operation)missing.push('compra ou locação');if(!p.city)missing.push('região');if(!p.propertyType)missing.push('tipo de imóvel');
 if(missing.length)return {matches:[],needs:missing,total:0};
 const matches=catalog.filter(x=>x.isIllustrative===false&&x.operation===p.operation&&samePlace(x.location,p.city)&&(!p.neighborhood||samePlace(x.location,p.neighborhood))).filter(x=>{const type=norm(x.type);return p.propertyType==='Terreno'?/terreno|lote|terra agricola/.test(type):p.propertyType==='Comercial'?/comercial|loja|sala|galpao|pavilhao|corporativo|centro de distribuicao/.test(type):p.propertyType==='Apartamento'?/apartamento|cobertura|compacto/.test(type):/casa|cabana/.test(type);}).filter(x=>(p.budgetMax===null||typeof x.price==='number'&&x.price>0&&x.price<=p.budgetMax)&&(p.bedrooms===null||typeof x.bedrooms==='number'&&x.bedrooms>=p.bedrooms)).map(x=>({id:x.id,title:x.title,location:x.location,price:x.price,image:x.image,reasons:[buyerEnums.operation[p.operation],p.city,p.propertyType,...(p.budgetMax!==null?['Dentro do valor informado']:[])],pending:[...(p.budgetMax===null?['Faixa de valor ainda não definida']:[]),...(p.essentials?['Conferir requisitos: '+p.essentials]:[]),'Confirmar disponibilidade com a equipe']}));
 return {matches:matches.slice(0,6),total:matches.length,needs:[]};
}
