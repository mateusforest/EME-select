import {randomUUID,createHash} from 'node:crypto';
import {leadInput} from '../../shared/leads.mjs';
import {buyerIntake} from '../../shared/buyer-qualification.mjs';
import {types} from './domain.mjs';
import {applyOperationsCommand,operationsScope,visibleOperations} from '../../shared/operations.mjs';
import {applyFinanceCommand} from '../../shared/finance.mjs';
import {financeFingerprint,financeStateSize} from '../finance.mjs';
import {operationsStateSize} from '../operations.mjs';
import {propertyRecordsQuery,internalKinds} from '../../shared/portal-content.mjs';
export const pilotPhones=['555499902688','5554984007919','5554981037089'];
export const norm=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const fail=message=>{throw Object.assign(Error(message),{status:400});};
const uuid=s=>/^[a-f0-9-]{36}$/i.test(s)?s.toLowerCase():fail('Copie a referência completa exibida na consulta de imóveis.');
const bounded=(v,max=120)=>v.length>=2&&v.length<=max?v:fail('Informe de 2 a '+max+' caracteres.');
const phone=v=>{let n=v.replace(/\D/g,'');if(n.length===10||n.length===11)n='55'+n;if(n==='555481037089')n='5554981037089';if(!pilotPhones.includes(n))fail('Neste teste, use somente os contatos finais 2688, 7919 ou 7089, com DDD.');return n;};
const date=v=>{const m=v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);const s=m?`${m[3]}-${m[2]}-${m[1]}`:v;if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)fail('Use DD/MM/AAAA.');return s;};
const instant=v=>{const m=v.match(/^(\d{2}\/\d{2}\/\d{4}) (\d{2}:\d{2})$/);if(!m||!/^([01]\d|2[0-3]):[0-5]\d$/.test(m[2]))fail('Use DD/MM/AAAA HH:mm, no horário de Brasília.');const s=date(m[1])+'T'+m[2]+':00-03:00';if(Date.parse(s)<Date.now())fail('Informe uma data futura.');return new Date(s).toISOString();};
const money=v=>{const s=v.replace(/R\$/gi,'').trim();if(!/^(\d+|\d{1,3}(\.\d{3})+)(,\d{1,2})?$/.test(s))fail('Use reais, por exemplo 1500 ou 1.500,50.');const n=Math.round(Number(s.replace(/\./g,'').replace(',','.'))*100);if(!Number.isSafeInteger(n)||n<=0||n>1e12)fail('Confira o valor.');return n;};
const choice=(v,list)=>{const found=list.find(x=>norm(x)===norm(v));return found||fail('Escolha: '+list.join(', '));};
const yes=v=>choice(v,['SIM','NÃO'])==='SIM';
export const forms={
 lead:[['name','Qual é o nome do cliente?',v=>bounded(v,100)],['phone','Qual é o WhatsApp do cliente, com DDD?',phone],['message','O que ele procura? Descreva a busca.',v=>bounded(v,1500)],['permission','O cliente autorizou contato? Responda SIM ou NÃO.',yes]],
 property:[['title','Qual é o título do imóvel?',v=>bounded(v)],['city','Em qual cidade?',v=>bounded(v)],['type','Qual é o tipo? Casa, Apartamento, Terreno urbano ou Sala comercial.',v=>choice(v,['Casa','Apartamento','Terreno urbano','Sala comercial'])],['operation','Venda ou Locação?',v=>choice(v,['Venda','Locação'])],['owner','Nome do proprietário (ou PULAR).',v=>norm(v)==='pular'?'':bounded(v)]],
 visit:[['propertyId','Qual é a referência do imóvel? Copie o código de CONSULTAR IMÓVEIS.',uuid],['visitorName','Qual é o nome do visitante?',v=>bounded(v)],['visitorPhone','WhatsApp do visitante, com DDD?',phone],['startAt','Quando começa? Use DD/MM/AAAA HH:mm (Brasília).',instant],['duration','Quantos minutos? De 15 a 240.',v=>/^\d+$/.test(v)&&+v>=15&&+v<=240?+v:fail('Informe de 15 a 240 minutos.')],['notify','O visitante autoriza avisos desta visita: solicitação, alterações e lembrete? SIM ou NÃO.',yes]],
 finance:[['description','Qual é a descrição do lançamento?',v=>bounded(v)],['category','Categoria: Marketing, Sistemas, Outras despesas ou Outras receitas.',v=>({'Marketing':'marketing','Sistemas':'software','Outras despesas':'other_expense','Outras receitas':'other_revenue'})[choice(v,['Marketing','Sistemas','Outras despesas','Outras receitas'])]],['amountCents','Qual é o valor em reais? Exemplo: 1500,50.',money],['competenceDate','Data de competência (DD/MM/AAAA)?',date],['dueDate','Data de vencimento (DD/MM/AAAA)?',date]]
};
const labels={name:'Cliente',phone:'WhatsApp',message:'Busca',permission:'Contato autorizado',title:'Título',city:'Cidade',type:'Tipo',operation:'Finalidade',owner:'Proprietário',propertyId:'Imóvel',visitorName:'Visitante',visitorPhone:'WhatsApp do visitante',startAt:'Início',duration:'Duração em minutos',notify:'Avisar visitante',description:'Descrição',category:'Categoria',amountCents:'Valor',competenceDate:'Competência',dueDate:'Vencimento'};
export function planSummary(flow){return Object.entries(flow.values).map(([k,v])=>`${labels[k]||k}: ${k==='amountCents'?(v/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}):k==='startAt'?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):typeof v==='boolean'?(v?'Sim':'Não'):v||'Não informado'}`).join('\n');}
export const teamMenu='Posso consultar e cadastrar no portal. Escolha:\n• CONSULTAR LEADS\n• CONSULTAR IMÓVEIS\n• CONSULTAR AGENDA\n• CONSULTAR FINANCEIRO (administração)\n• CADASTRAR LEAD\n• CADASTRAR IMÓVEL\n• AGENDAR VISITA\n• LANÇAR FINANCEIRO (administração)\n\nCLIENTE muda para pré-atendimento. CANCELAR interrompe um cadastro. Nenhuma alteração ocorre sem sua confirmação.';
export function createChannelTools({client}){
 const {rest,rpc}=client;
 const actor=async phone=>{const links=await rest('eme_staff_wa_links?phone=eq.'+phone+'&select=user_id');if(!links[0])return null;return (await rest('eme_profiles?id=eq.'+links[0].user_id+'&active=eq.true&must_change=eq.false&select=id,name,role,active,must_change'))[0]||null;};
 const properties=async u=>(await rest('eme_cases?select=id,version,assignee_id,data&order=updated_at.desc&limit=100'+propertyRecordsQuery+(u.role==='admin'?'':'&assignee_id=eq.'+u.id))).filter(r=>!r.data.deletedAt&&!r.data.archived&&!internalKinds.includes(r.data.kind));
 const context=async u=>({actorId:u.id,role:u.role,now:new Date().toISOString(),members:await rest('eme_profiles?select=id,name,role,active'+(u.role==='admin'?'':'&id=eq.'+u.id)),properties:(await properties(u)).map(r=>({id:r.id,title:r.data.title||r.data.draft?.title,assigneeId:r.assignee_id}))});
 const access=u=>{if(!u?.active||u.must_change)fail('Vincule sua conta ativa no portal antes de continuar.');};
 const financeAccess=u=>{access(u);if(u.role!=='admin')throw Object.assign(Error('O financeiro da empresa está disponível apenas para administradores.'),{status:403});};
 async function query(kind,u){access(u);
  if(kind==='leads'){const rows=await rest('eme_leads?select=id,status,data,updated_at&order=updated_at.desc&limit=8'+(u.role==='admin'?'':'&assignee_id=eq.'+u.id));return rows.length?rows.map(r=>`${r.data.name} · ${r.status}\n${r.id}`).join('\n\n'):'Nenhum lead disponível para sua conta.';}
  if(kind==='imoveis'){const rows=(await properties(u)).slice(0,8);return rows.length?rows.map(r=>`${r.data.title||r.data.draft?.title} · ${r.data.city||r.data.draft?.city}\n${r.id}`).join('\n\n'):'Nenhum imóvel disponível para sua conta.';}
  if(kind==='agenda'){const row=(await rest('eme_operations_state?id=eq.company&select=data'))[0];const ctx=await context(u);const visits=visibleOperations(row.data,ctx).visits.filter(v=>!['cancelled','completed'].includes(v.status)).sort((a,b)=>a.startAt.localeCompare(b.startAt)).slice(0,8);return visits.length?visits.map(v=>`${v.visitorName} · ${new Date(v.startAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · ${v.status}\n${v.id}`).join('\n\n'):'Nenhuma visita pendente na sua agenda.';}
  if(kind==='financeiro'){financeAccess(u);const row=(await rest('eme_finance_state?id=eq.company&select=data'))[0];const entries=row.data.entries.filter(e=>e.status==='open').sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,8);return entries.length?entries.map(e=>`${e.description} · ${(e.amountCents/100).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}\nVencimento: ${e.dueDate} · Em aberto`).join('\n\n'):'Nenhum lançamento em aberto.';}
  fail('Consulta não reconhecida. Escreva MENU.');
 }
 async function prepare(flow,u){access(u);const v=flow.values;let payload;
  if(flow.kind==='lead'){const input=buyerIntake({requestId:flow.id,name:v.name,phone:v.phone,email:'',channel:'whatsapp',sourceDetail:'Cadastro confirmado pela equipe no WhatsApp',message:v.message,contactPermission:v.permission?'granted':'declined'});payload={data:input.data};}
  else if(flow.kind==='property'){if(!types.includes(v.type))fail('Tipo inválido.');payload={data:{title:v.title,city:v.city,type:v.type,operation:v.operation,owner:v.owner,stage:'Recebido',photos:[],published:null,source:'whatsapp-pilot'}};}
  else if(flow.kind==='visit'){const current=(await rest('eme_operations_state?id=eq.company&select=version,data'))[0],ctx=await context(u);const command={type:'visit.save',data:{id:flow.id,propertyId:v.propertyId,visitorName:v.visitorName,visitorPhone:v.visitorPhone,startAt:v.startAt,endAt:new Date(Date.parse(v.startAt)+v.duration*60000).toISOString(),brokerId:u.id,notes:'Solicitada pelo WhatsApp; aguarda confirmação no portal.'}};const scope=operationsScope(current.data,command,ctx),next=applyOperationsCommand(current.data,command,ctx);operationsStateSize(next);payload={version:current.version,command,commandHash:financeFingerprint(command),propertyId:scope.propertyId,next,beforeHash:financeFingerprint(current.data),afterHash:financeFingerprint(next)};}
  else if(flow.kind==='finance'){financeAccess(u);const current=(await rest('eme_finance_state?id=eq.company&select=version,data'))[0];const command={type:'entry.save',data:{id:flow.id,...v,settleNow:false,recognition:'forecast',notes:'Lançamento confirmado pelo WhatsApp. Sem baixa ou pagamento.'}};const next=applyFinanceCommand(current.data,command,await context(u));financeStateSize(next);payload={version:current.version,command,commandHash:financeFingerprint(command),next,beforeHash:financeFingerprint(current.data),afterHash:financeFingerprint(next)};}
  if(flow.kind==='visit'&&v.notify)payload.notification={phone:v.visitorPhone,body:'EME Select · Visita solicitada\n\n'+v.visitorName+', registramos sua solicitação para '+new Date(v.startAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. A visita ainda aguarda confirmação da equipe.\nReferência: '+flow.id};
  return payload;
 }
 async function execute(phone,flow,u){const fresh=await actor(phone);if(!fresh||fresh.id!==u.id)fail('O vínculo da conta mudou. Recomece o cadastro.');
  const fingerprint=financeFingerprint({kind:flow.kind,values:flow.values,actor:fresh.id});
  const prior=(await rest('eme_channel_actions?id=eq.'+flow.id+'&phone=eq.'+phone+'&actor_id=eq.'+fresh.id+'&fingerprint=eq.'+fingerprint+'&select=result'))[0];if(prior)return prior.result;
  return rpc('eme_channel_action',{p_phone:phone,p_actor:fresh.id,p_id:flow.id,p_kind:flow.kind,p_fingerprint:fingerprint,p_payload:await prepare(flow,fresh)});
 }
 async function clientLead(phone,state){const input=leadInput({requestId:state.reference,name:state.answers.nome||'Contato WhatsApp',phone,message:state.brief.slice(0,1500),interest:'Pré-atendimento WhatsApp EME',consent:true,source:{page:'/acesso-select/equipe/whatsapp',medium:'whatsapp',origin:'pre-atendimento-oficial'}});return rpc('eme_channel_action',{p_phone:phone,p_actor:null,p_id:state.reference,p_kind:'client_lead',p_fingerprint:financeFingerprint(input.data),p_payload:{data:input.data,notification:{phone:'5554984007919',body:'*EME Select | Novo atendimento*\n\nContato: +'+phone+'\n\n'+state.brief+'\n\n*Referência no portal*\n'+state.reference+'\n\nContinue o atendimento pelo contato informado. Disponibilidade e condições precisam ser confirmadas.'}}});}
 async function notify(event,phone,body,actorId){const hex=createHash('sha256').update(event+':'+phone).digest('hex');const id=hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-a'+hex.slice(17,20)+'-'+hex.slice(20,32);return rpc('eme_channel_notify',{p_id:id,p_phone:phone,p_body:body.slice(0,4000),p_actor:actorId});}
 return {actor,query,prepare,execute,clientLead,notify,financeAccess};
}

