import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {channelBrief,readiness} from './channel-conversation.mjs';
const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
const hash=s=>createHash('sha256').update(s).digest('hex');
const clean=s=>String(s||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
export function attachLocalChannel({db,env,ai,leads,consume,stamp}){
 db.exec(`CREATE TABLE IF NOT EXISTS channel_conversations(phone TEXT PRIMARY KEY,state TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS channel_events(id TEXT PRIMARY KEY,phone TEXT NOT NULL,hash TEXT NOT NULL,response TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS channel_links(phone TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id));
 CREATE TABLE IF NOT EXISTS channel_codes(hash TEXT PRIMARY KEY,phone TEXT NOT NULL,user_id TEXT NOT NULL REFERENCES users(id),expires INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS channel_requests(id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),phone TEXT NOT NULL,kind TEXT NOT NULL,description TEXT NOT NULL,status TEXT NOT NULL,created_at TEXT NOT NULL);`);
 const enabled=()=>env.EME_CHANNEL_TEST_ENABLED==='true';
 const live=user=>{const row=user&&db.prepare('SELECT * FROM users WHERE id=?').get(user.id);if(!row?.active||row.must_change)fail(403,'Entre com uma conta ativa do portal.');return row;};
 const identity=phone=>db.prepare('SELECT u.* FROM channel_links l JOIN users u ON u.id=l.user_id WHERE l.phone=? AND u.active=1 AND u.must_change=0').get(phone);
 const locks=new Map();
 async function message(body){
  if(!body||body.sessionId!==(env.EME_CHANNEL_SESSION_ID||'eme-teste-8338')||typeof body.messageId!=='string'||body.messageId.length>150||typeof body.text!=='string'||!body.text.trim()||body.text.length>1500)fail(400,'Mensagem inválida.');
  const phone=body.phone;
  if(!(env.EME_CHANNEL_TEST_PHONES||'').split(',').includes(phone))fail(403,'Contato fora do teste.');
  const id=phone+':'+body.messageId,payloadHash=hash(body.text);
  const prior=locks.get(phone)||Promise.resolve();
  const work=prior.catch(()=>{}).then(async()=>{
   const receipt=db.prepare('SELECT * FROM channel_events WHERE id=?').get(id);
   if(receipt){if(receipt.hash!==payloadHash)fail(409,'Evento alterado.');return JSON.parse(receipt.response);}
   consume('channel:'+phone,35);
   const stored=db.prepare('SELECT state FROM channel_conversations WHERE phone=?').get(phone);
   let state=stored?JSON.parse(stored.state):{mode:'lead',status:'active',answers:{},messages:[],reference:randomUUID()};
   const text=body.text.trim(),cmd=clean(text);let reply='',forward=false,reference=null;
   const save=()=>{const result={reply,forward,reference,answers:state.answers,readiness:readiness(state.answers),status:state.status,mode:state.mode};db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO channel_conversations VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET state=excluded.state').run(phone,JSON.stringify(state));db.prepare('INSERT INTO channel_events VALUES(?,?,?,?)').run(id,phone,payloadHash,JSON.stringify(result));db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}};
   if(/^(parar|sair|cancelar)$/.test(cmd)){state.status='stopped';reply='Tudo bem. Encerrei o atendimento automático. Se quiser voltar, escreva RECOMEÇAR.';return save();}
   if(/^(recomecar|reiniciar)$/.test(cmd)){state={mode:'lead',status:'active',answers:{},messages:[],reference:randomUUID()};reply='Vamos começar de novo. O que você gostaria de encontrar ou resolver hoje?';return save();}
   if(state.status==='stopped'||state.status==='human')return save();
   if(/^vincular [a-f0-9]{16}$/.test(cmd)){
    consume('channel-link:'+phone,5);const code=db.prepare('SELECT * FROM channel_codes WHERE hash=? AND phone=? AND expires>?').get(hash(cmd.slice(9)),phone,Date.now());
    if(!code){reply='Código inválido ou expirado. Gere um novo no portal.';return save();}
    live({id:code.user_id});db.prepare('INSERT INTO channel_links VALUES(?,?) ON CONFLICT(phone) DO UPDATE SET user_id=excluded.user_id').run(phone,code.user_id);db.prepare('DELETE FROM channel_codes WHERE hash=?').run(hash(cmd.slice(9)));
    state.mode='staff';reply='Seu WhatsApp foi vinculado à sua conta do portal. Posso orientar, registrar um chamado ou preparar uma solicitação de cadastro/atualização para revisão. O que você precisa?';return save();
   }
   if(/\b(equipe|colaborador|sou corretor|suporte interno)\b/.test(cmd)){state.mode='staff';state.pending=null;}
   if(state.mode==='staff'){
    const user=identity(phone);
    if(!user){reply='Para atendimento da equipe, entre no portal local e gere seu código em Central de IA → Canal de teste. Envie VINCULAR seguido do código aqui. Não envie sua senha pelo WhatsApp.';return save();}
    if(state.pending&&/^(sim|confirmo|confirmar)$/.test(cmd)){
     reference=state.pending.id;db.prepare('INSERT OR IGNORE INTO channel_requests VALUES(?,?,?,?,?,?,?)').run(reference,user.id,phone,state.pending.kind,state.pending.text,'pending_review',stamp());
     reply='Registrei sua solicitação no portal, protocolo '+reference+'. Ela está aguardando revisão. Nenhum imóvel ou lead foi alterado automaticamente.';state.pending=null;return save();
    }
    if(/\b(chamado|problema|erro|cadastrar|cadastro|atualizar|alterar)\b/.test(cmd)){
     state.pending={id:randomUUID(),kind:/cadastr|atualiz|alterar/.test(cmd)?'cadastro_atualizacao':'suporte',text};
     reply='Entendi. Vou registrar no portal para revisão:\n'+text+'\n\nConfirma com SIM? Para desistir, CANCELAR. Não envie senhas, documentos pessoais ou dados bancários.';return save();
    }
    reply='Posso ajudar em duas frentes: registrar um CHAMADO com sua dificuldade, ou preparar um pedido para CADASTRAR/ATUALIZAR um imóvel ou lead. Descreva o que precisa e a referência do registro, se tiver. Consultas e alterações de dados internos continuam no portal, com as permissões da sua conta.';return save();
   }
   if(state.status==='confirm'&&/^(sim|confirmo|confirmar|ok)$/.test(cmd)){
    const brief=channelBrief(state.answers),r=readiness(state.answers);
    await leads.publicHandle('/api/public/leads',{method:'POST',socket:{remoteAddress:'whatsapp-test'}},{requestId:state.reference,name:state.answers.nome||'Contato WhatsApp',phone,message:(brief+'\n'+r.label+' — '+r.reasons.join('; ')).slice(0,1500),interest:'Pré-atendimento WhatsApp EME',consent:true,source:{page:'/whatsapp-teste',medium:'whatsapp',origin:'laboratorio-local'}},()=>{});
    reference=state.reference;state.status='human';forward=true;reply='Seu atendimento foi registrado no portal. Vou avisar o corretor com suas preferências para ele continuar a conversa, sem você precisar contar tudo outra vez. A equipe confirmará opções e disponibilidade.';return save();
   }
   if(/^(corretor|humano|atendente|encaminhar)$/.test(cmd)){
    state.status='confirm';reply='Claro. Posso registrar seu contato no portal e enviar ao corretor o que conversamos?\n'+channelBrief(state.answers)+'\nResponda SIM para confirmar ou PARAR para encerrar.';return save();
   }
   state.status='active';state.messages.push({role:'user',content:text});state.messages=state.messages.slice(-20);
   try{
    const result=await ai.channelConversation({messages:state.messages,answers:state.answers});state.answers=result.answers;reply=result.reply;
    if(['objetivo','regiao','tipo','orcamento','prazo'].every(k=>state.answers[k])){state.status='confirm';reply='Já tenho um bom ponto de partida:\n'+channelBrief(state.answers)+'\n\nPosso registrar no portal e encaminhar seu contato e este resumo ao corretor? Responda SIM, ou me diga o que gostaria de corrigir.';}
   }catch{reply='A conversa com a assistente está temporariamente indisponível. Você pode escrever CORRETOR para solicitar atendimento humano, ou EQUIPE para suporte interno. Não perdi o que já ficou registrado.';}
   state.messages.push({role:'assistant',content:reply});return save();
  });locks.set(phone,work);try{return await work;}finally{if(locks.get(phone)===work)locks.delete(phone);}
 }
 return {
 async bridge(path,req,body,send){
  if(path!=='/api/integrations/whatsapp-test/message')return false;
  if(!enabled()||req.method!=='POST')fail(404,'Canal indisponível.');
  const expected=env.EME_CHANNEL_TEST_TOKEN||'',actual=String(req.headers.authorization||'').replace(/^Bearer /,'');
  if(expected.length<32||actual.length!==expected.length||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))fail(401,'Integração não autorizada.');
  send(200,await message(body));return true;
 },
 async handle(path,req,user,body,send){
  if(!path.startsWith('/api/channel-test'))return false;
  if(!enabled())fail(404,'Canal indisponível.');const actor=live(user);
  if(path==='/api/channel-test'&&req.method==='GET'){
   const requests=db.prepare('SELECT id,user_id,phone,kind,description,status,created_at FROM channel_requests WHERE ?=1 OR user_id=? ORDER BY created_at DESC LIMIT 100').all(actor.role==='admin'?1:0,actor.id);
   send(200,{enabled:true,aiAvailable:await ai.publicChatAvailable(),requests});return true;
  }
  if(path==='/api/channel-test/link'&&req.method==='POST'){
   const phone=String(body?.phone||'').replace(/\D/g,'');if(!(env.EME_CHANNEL_TEST_PHONES||'').split(',').includes(phone))fail(400,'Use um contato autorizado para o teste.');
   consume('channel-code:'+actor.id,5);const code=randomBytes(8).toString('hex');db.prepare('DELETE FROM channel_codes WHERE user_id=? OR expires<?').run(actor.id,Date.now());db.prepare('INSERT INTO channel_codes VALUES(?,?,?,?)').run(hash(code),phone,actor.id,Date.now()+600000);send(200,{command:'VINCULAR '+code,expiresInMinutes:10});return true;
  }
  fail(405,'Operação indisponível.');
 }};
}
