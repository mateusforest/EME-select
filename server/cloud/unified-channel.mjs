import {randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {channelBrief} from '../channel-conversation.mjs';
import {createChannelTools,forms,norm,planSummary,teamMenu,pilotPhones} from './channel-tools.mjs';
import {propertyInput,materialsPrompt,propertySummary} from './channel-property-flow.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const fresh=()=>({mode:'client',status:'active',answers:{},messages:[],reference:randomUUID(),flow:null});
export async function advanceChannel({state,phone,text,event,tools,ai,support,media}){
 state=state?.mode?structuredClone(state):fresh();let cmd=norm(text);let reply='';
 if(state.registrationMenu&&['1','2','3'].includes(cmd)){text={'1':'CADASTRAR IMÓVEL','2':'CADASTRAR CLIENTE','3':'AGENDAR VISITA'}[cmd];cmd=norm(text);state.registrationMenu=false;}
 if(state.flow?.confirm&&['1','2'].includes(cmd)){text=cmd==='1'?'SIM':'CANCELAR';cmd=norm(text);}
 if(state.flow?.materialsOpen&&!state.flow.confirm&&cmd==='3'){text='CANCELAR';cmd='cancelar';}
 if(state.flow&&['cliente','recomecar','reiniciar','equipe','parar','sair'].includes(cmd)&&tools.discard){const u=await tools.actor(phone);if(u&&u.id===state.flow.actorId)await tools.discard(state.flow,u);}
 const out=()=>({state,result:{reply,answers:state.answers||{},reference:state.reference||null,status:state.status,mode:state.mode,forward:false}});
 if(cmd==='cliente'||cmd==='recomecar'||cmd==='reiniciar'){state=fresh();reply='Você está no atendimento ao cliente da EME Select. Sou M, a assistente virtual. O que você procura ou gostaria de resolver? Seu vínculo com a equipe foi preservado; escreva EQUIPE para voltar.';return out();}
 if(cmd==='equipe'){await support(phone,event,'EQUIPE');state.mode='staff';state.status='active';state.flow=null;const u=await tools.actor(phone);reply=u?`Olá, ${u.name}!\n\n${teamMenu}`:'Entre na sua conta em https://www.emeselect.com/acesso-select/equipe/inteligencia e gere seu código em WhatsApp da equipe. Envie VINCULAR seguido do código aqui.';return out();}
 if(/^vincular [a-f0-9]{16}$/.test(cmd)){reply=(await support(phone,event,text)).reply;state.mode='staff';state.status='active';state.flow=null;return out();}
 if(['parar','sair'].includes(cmd)){state.status='stopped';state.flow=null;reply='Atendimento automático pausado. Para retomar, envie CLIENTE ou EQUIPE.';return out();}
 if(state.status==='stopped')return out();
 if(media?.error){reply=String(media.error).slice(0,300);return out();}
 if(media&&state.mode!=='staff'){reply='Para anexar arquivos ao cadastro, envie EQUIPE e depois ANEXAR ÚLTIMO ou CADASTRAR IMÓVEL.';return out();}
 const registrationMenu=/^(?:cadastro|cadastros|cadastrar|quero cadastrar|novo cadastro)[.!?]*$/.test(cmd);
 const registrationKind=/\b(?:cadastr\w*|registr\w*|novo|nova|adicionar)\b.*\b(?:lead|cliente|contato)\b/.test(cmd)?'lead':/\b(?:cadastr\w*|registr\w*|novo|nova|adicionar)\b.*\bimovel\b/.test(cmd)?'property':null;
 if(!state.flow&&(registrationMenu||registrationKind)){
  const u=await tools.actor(phone);
  if(!u){reply='Para cadastrar no portal, primeiro vincule seu WhatsApp à sua conta em https://www.emeselect.com/acesso-select/equipe/inteligencia . Depois envie CADASTRAR IMÓVEL ou CADASTRAR CLIENTE.';return out();}
  state.mode='staff';state.status='active';
  if(registrationMenu){state.registrationMenu=true;reply='O que você quer cadastrar?\n\n1 · CADASTRAR IMÓVEL — ficha inicial para avaliação\n2 · CADASTRAR CLIENTE — lead e interesse\n3 · AGENDAR VISITA — solicitação de visita\n\nVou pedir os dados e mostrar um resumo. Só salvo depois do seu SIM.';return out();}
  state.registrationMenu=false;state.flow={kind:registrationKind,id:randomUUID(),actorId:u.id,step:0,values:{}};reply=forms[registrationKind][0][1];return out();
 }
 if(state.mode==='staff'){
  const u=await tools.actor(phone);if(!u){reply='Vincule seu WhatsApp à sua conta ativa no portal para consultar dados ou cadastrar. Acesse https://www.emeselect.com/acesso-select/equipe/inteligencia . Para atendimento ao cliente, envie CLIENTE.';return out();}
  if(cmd==='cancelar'){if(tools.discard)await tools.discard(state.flow,u);state.flow=null;reply='Cadastro em andamento cancelado. Nenhuma nova alteração foi realizada.\n\n'+teamMenu;return out();}
  if(cmd==='menu'||cmd==='ajuda'){reply=teamMenu;return out();}
  const q=cmd.match(/^(?:consultar |meus |minha |minhas )?(leads|imoveis|agenda|financeiro)$/);
  if(q){reply=await tools.query(q[1],u);return out();}
  if(!state.flow){
   const attachment=cmd.match(/^anexar(?: (ultimo|[a-f0-9-]{36}))?$/);if(attachment){state.flow=await tools.openProperty(attachment[1]||'ultimo',u);reply='Materiais para: '+state.flow.values.title+'\n\n'+materialsPrompt;return out();}
   if(media){reply='Para anexar ao último imóvel que você cadastrou, envie ANEXAR ÚLTIMO. Para outro imóvel, envie ANEXAR e a referência dele. Depois reenvie o arquivo.';return out();}
   const kind=/cadastr.*lead|novo lead/.test(cmd)?'lead':/cadastr.*imovel|novo imovel/.test(cmd)?'property':/agend.*visita|nova visita/.test(cmd)?'visit':/lancar.*financeiro|lancamento financeiro/.test(cmd)?'finance':null;
   if(kind){if(kind==='finance')tools.financeAccess(u);state.flow={kind,id:randomUUID(),actorId:u.id,step:0,values:{}};reply=forms[kind][0][1];return out();}
   reply=(await support(phone,event,text)).reply;return out();
  }
  const flow=state.flow;if(flow.actorId!==u.id){state.flow=null;reply='A conta vinculada mudou. Inicie novamente o cadastro na conta correta.';return out();}
  if(media&&flow.kind!=='property'){reply='Anexos estão disponíveis no cadastro de imóveis. Continue este cadastro por texto ou envie CANCELAR para trocar.';return out();}
  if(flow.kind==='property'){const handled=await propertyInput({flow,text,media,phone,event,u,tools,ai});if(handled!==null){reply=handled;return out();}}
  if(flow.confirm){
   if(!['sim','confirmar','confirmo'].includes(cmd)){reply='Para registrar, responda SIM. Para corrigir os dados, envie CANCELAR e reinicie o cadastro.\n\n'+planSummary(flow);return out();}
   const result=await tools.execute(phone,flow,u);reply='Registrado no portal oficial.\n\n'+(flow.kind==='property'?propertySummary(flow):planSummary(flow))+'\n\nReferência: '+result.reference;
   reply+=flow.kind==='property'?'\nMateriais anexados ao cadastro privado. Revise o imóvel no portal: https://www.emeselect.com/acesso-select/equipe/imoveis?imovel='+result.reference+'\nPara enviar mais arquivos depois, escreva ANEXAR ÚLTIMO.':flow.kind==='visit'?'\nA visita está solicitada e aguarda confirmação no portal.':flow.kind==='finance'?'\nLançamento em aberto. Nenhum pagamento ou baixa foi realizado.':'';
   state.flow=null;return out();
  }
  const field=forms[flow.kind][flow.step];try{flow.values[field[0]]=field[2](text);}catch(e){reply=e.message+'\n\n'+field[1];return out();}
  flow.step++;
  if(flow.kind==='property'){if(flow.values.price===undefined&&flow.values.extracted?.price!==undefined)flow.values.price=flow.values.extracted.price;while(flow.step<forms.property.length&&flow.values[forms.property[flow.step][0]]!==undefined)flow.step++;if(flow.step===forms.property.length){flow.materialsOpen=true;reply=materialsPrompt;return out();}}
  if(flow.step<forms[flow.kind].length){reply=forms[flow.kind][flow.step][1];return out();}
  await tools.prepare(flow,u);flow.confirm=true;reply='Confira antes de registrar:\n\n'+planSummary(flow)+'\n\nResponda SIM para cadastrar no portal ou CANCELAR para desistir.';return out();
 }
 if(state.status==='human'){return out();}
 if(cmd==='cancelar'){state.status='active';reply='Encaminhamento cancelado. O que gostaria de corrigir na sua busca?';return out();}
 if(state.status==='confirm'&&['sim','confirmo','confirmar','ok'].includes(cmd)){
  state.brief=channelBrief(state.answers);const r=await tools.clientLead(phone,state);state.reference=r.reference;state.status='human';reply='Seu atendimento foi registrado no portal oficial da EME Select. '+(r.notificationQueued?'O resumo entrou na fila de envio ao corretor.':'O atendimento está disponível para a equipe no portal.')+'\n\nReferência: '+r.reference+'\nA equipe confirmará opções e disponibilidade.';return out();
 }
 if(['corretor','humano','atendente','encaminhar'].includes(cmd)){state.status='confirm';reply='Posso registrar seu contato no portal e encaminhar o resumo ao corretor?\n\n'+channelBrief(state.answers)+'\n\nResponda SIM para autorizar, ou CANCELAR.';return out();}
 state.status='active';state.messages.push({role:'user',content:text});state.messages=state.messages.slice(-20);while(state.messages.length>1&&state.messages.reduce((n,m)=>n+m.content.length,0)>24000)state.messages.shift();
 try{const r=await ai.channelConversation({messages:state.messages,answers:state.answers});state.answers=r.answers;reply=r.reply;if(['objetivo','regiao','tipo','orcamento','prazo'].every(k=>state.answers[k])){state.status='confirm';reply='Veja se entendi sua busca:\n\n'+channelBrief(state.answers)+'\n\nPosso registrar seu contato no portal e encaminhar este resumo ao corretor? Responda SIM, ou me diga o que ajustar.';}}
 catch{reply='A assistente está temporariamente indisponível. Escreva CORRETOR para solicitar atendimento humano. Para suporte da equipe, envie EQUIPE.';}
 state.messages.push({role:'assistant',content:reply});return out();
}
export function attachUnifiedChannel({client,ai,env=process.env}){
 const tools=createChannelTools({client});
 const support=(phone,event,text)=>client.rpc('eme_staff_wa_message',{p_phone:phone,p_message_id:event,p_text:text,p_content_hash:hash(text),p_code_hash:/^vincular [a-f0-9]{16}$/i.test(text)?hash(text.slice(9).toLowerCase()):''});
 return {async bridge(path,req,body,send){
  if(path!=='/api/integrations/eme-channel/message')return false;
  const expected=Buffer.from(env.EME_STAFF_WHATSAPP_TOKEN||''),actual=Buffer.from(String(req.headers.authorization||'').replace(/^Bearer /,''));
  if(env.EME_STAFF_WHATSAPP_ENABLED!=='true'||req.method!=='POST')throw Object.assign(Error('Canal indisponível.'),{status:404});
  if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(expected,actual))throw Object.assign(Error('Integração não autorizada.'),{status:401});
  if(!pilotPhones.includes(body?.phone)||body?.sessionId!=='eme-oficial-8029')throw Object.assign(Error('Contato fora do teste.'),{status:403});
  if(typeof body.text!=='string'||!body.text.trim()||body.text.length>20000||typeof body.messageId!=='string'||!body.messageId||body.messageId.length>150)throw Object.assign(Error('Mensagem inválida.'),{status:400});
  const args={p_phone:body.phone,p_event:body.messageId,p_hash:hash(body.text+JSON.stringify(body.media||null))};const start=await client.rpc('eme_channel_turn',{...args,p_action:'begin'});if(start.cached){send(200,start.cached);return true;}
  try{
   let next;try{next=await advanceChannel({state:start.state,phone:body.phone,text:body.text.trim(),event:body.messageId,tools,ai,support,media:body.media});}
   catch(e){if(![400,403,404,409].includes(e.status))throw e;next={state:start.state,result:{reply:e.message+'\nEnvie CANCELAR para reiniciar o cadastro ou MENU para ver as opções.',answers:{},mode:start.state.mode||'client',status:start.state.status||'active',forward:false}};}
   const result=await client.rpc('eme_channel_turn',{...args,p_action:'finish',p_lock:start.lock,p_state:next.state,p_result:next.result});send(200,result);return true;
  }catch(e){await client.rpc('eme_channel_turn',{...args,p_action:'release',p_lock:start.lock}).catch(()=>{});throw e;}
 }};
}
