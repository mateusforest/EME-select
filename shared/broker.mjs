// Broker responses are explicit projections, never a filtered finance-state spread.
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
const amount=(v,label,max=1e12)=>{if(!Number.isSafeInteger(v)||v<0||v>max)fail(label+' inválido.');return v;};
const text=(v,label,max=160)=>{if(typeof v!=='string'||v.trim().length<2||v.trim().length>max)fail('Confira '+label+'.');return v.trim();};
const pct=(v,b)=>Number((BigInt(v)*BigInt(b)+5000n)/10000n);
const shares=(fee,parts)=>{const out=parts.map(p=>Number(BigInt(fee)*BigInt(p.bps)/10000n));let remainder=pct(fee,parts.reduce((n,p)=>n+p.bps,0))-out.reduce((n,v)=>n+v,0);const order=parts.map((p,i)=>({i,r:BigInt(fee)*BigInt(p.bps)%10000n})).sort((a,b)=>a.r===b.r?a.i-b.i:a.r>b.r?-1:1);for(const p of order){if(remainder--<=0)break;out[p.i]++;}return out;};
export function brokerUser(user){if(!user)fail('Entre na sua conta.',401);if(!user.active||user.must_change||!['admin','corretor'].includes(user.role))fail('Acesso indisponível.',403);}
export function applyBrokerAgreement(state,command,context){
 const d=command.data,agreements=state.brokerAgreements||=[];
 if(command.type==='broker.origin'){
  if(!context.properties.some(p=>p.id===d.propertyId))fail('Imóvel não encontrado.');
  if(!context.members.some(p=>p.id===d.captorId&&p.active!==false))fail('Selecione uma pessoa ativa.');
  const reason=text(d.reason,'a referência da captação',600),rows=state.brokerOrigins||=[];
  const prior=rows.find(p=>p.propertyId===d.propertyId);
  if(prior){prior.captorId=d.captorId;prior.reason=reason;prior.updatedAt=context.now;}else rows.push({propertyId:d.propertyId,captorId:d.captorId,reason,createdBy:context.actorId,createdAt:context.now,updatedAt:context.now});return state;
 }
 if(command.type==='broker.archive'){
  const row=agreements.find(a=>a.id===d.id);if(!row)fail('Acordo não encontrado.',404);
  if(row.status!=='potential')fail('Este acordo já foi encerrado.');
  row.status='archived';row.archiveReason=text(d.reason,'o motivo',600);row.updatedAt=context.now;return state;
 }
 if(command.type==='broker.close'){
  const row=agreements.find(a=>a.id===d.id);if(!row)fail('Acordo não encontrado.',404);
  if(row.status!=='potential')fail('Este acordo já foi encerrado.');
  const day=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('Data inválida.');return v;};
  const actualFeeCents=amount(d.actualFeeCents,'Honorários efetivos');if(!actualFeeCents)fail('Informe os honorários efetivos.');
  const competenceDate=day(d.competenceDate),dueDate=day(d.dueDate);
  if(competenceDate>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(context.now)))fail('O fechamento não pode estar no futuro.');
  const closingNote=text(d.note,'a referência do fechamento',600);
  const allocations=shares(actualFeeCents,row.participants);
  for(const [index,p] of row.participants.entries()){const cents=allocations[index];if(!cents)continue;
   state.entries.push({id:globalThis.crypto.randomUUID(),description:'Comissão · '+row.title,category:'broker_commission',amountCents:cents,recognition:'recognized',status:'open',competenceDate,dueDate,settledDate:null,accountId:null,destinationAccountId:null,behavior:'variable',costCenter:'Corretagem',brokerId:p.brokerId,propertyId:row.propertyId,partnerId:null,operationId:null,recurrenceId:null,recurrenceMonth:null,agreementId:row.id,notes:closingNote,cancelReason:null,createdAt:context.now,updatedAt:context.now,createdBy:context.actorId});
  }
  row.status='closed';row.actualFeeCents=actualFeeCents;row.closedAt=context.now;row.updatedAt=context.now;return state;
 }
 if(command.type!=='broker.save')fail('Ação indisponível.');
 if(d.id)fail('Acordos preservam as condições originais. Arquive e registre uma nova versão.');
 const property=context.properties.find(p=>p.id===d.propertyId);if(!property)fail('Selecione um imóvel cadastrado.');
 if(agreements.some(a=>a.propertyId===d.propertyId&&a.status==='potential'))fail('Já existe um acordo ativo para este imóvel.',409);
 const member=id=>{if(!context.members.some(p=>p.id===id&&p.active!==false))fail('Selecione uma pessoa ativa.');return id;};
 const captorId=d.captorId?member(d.captorId):null;
 if(!Array.isArray(d.participants)||!d.participants.length||d.participants.length>10)fail('Informe os participantes.');
 const participants=d.participants.map(p=>({brokerId:member(p.brokerId),role:text(p.role,'a função',60),bps:amount(p.bps,'Participação',10000)}));
 if(participants.some(p=>!p.bps)||participants.reduce((n,p)=>n+p.bps,0)>10000)fail('A soma das participações deve ser de até 100%.');
 if(new Set(participants.map(p=>p.brokerId)).size!==participants.length)fail('Consolide as funções da mesma pessoa em uma participação.');
 const feeCents=amount(d.feeCents,'Honorários estimados');if(!feeCents)fail('Informe os honorários estimados da imobiliária.');
 agreements.push({id:globalThis.crypto.randomUUID(),propertyId:property.id,title:property.title,model:text(d.model,'o modelo',100),captorId,feeCents,participants,terms:text(d.terms,'as condições',1200),status:'potential',createdAt:context.now,updatedAt:context.now,createdBy:context.actorId});
 return state;
}
export function brokerSnapshot(state,user,properties=[],members=[]){
 brokerUser(user);
 const name=id=>members.find(m=>m.id===id)?.name||'Não informado';
 const agreements=(state.brokerAgreements||[]).filter(a=>a.participants.some(p=>p.brokerId===user.id)).map(a=>{
  const me=a.participants.find(p=>p.brokerId===user.id);const property=properties.find(p=>p.id===a.propertyId);
  return {id:a.id,propertyId:a.propertyId,title:a.title,model:a.model,status:a.status,role:me.role,bps:me.bps,feeCents:a.feeCents,potentialCents:a.status==='potential'?shares(a.feeCents,a.participants)[a.participants.indexOf(me)]:0,terms:a.terms,captor:name(a.captorId),responsible:property?name(property.assigneeId):'Consulte a gestão',createdAt:a.createdAt};
 });
 const entries=(state.entries||[]).filter(e=>e.category==='broker_commission'&&e.brokerId===user.id&&e.status!=='cancelled').map(e=>({id:e.id,propertyId:e.propertyId,title:e.description,amountCents:e.amountCents,status:e.status,recognition:e.recognition,dueDate:e.dueDate,settledDate:e.settledDate,agreementId:e.agreementId||null}));
 const sum=rows=>rows.reduce((n,e)=>n+e.amountCents,0);
 const portfolio=properties.filter(p=>user.role==='admin'||p.assigneeId===user.id).map(p=>({id:p.id,title:p.title,responsible:name(p.assigneeId),captor:name((state.brokerOrigins||[]).find(o=>o.propertyId===p.id)?.captorId||(state.brokerAgreements||[]).filter(a=>a.propertyId===p.id&&a.status!=='archived').at(-1)?.captorId)}));
 return {portfolio,agreements,entries,totals:{potentialCents:agreements.reduce((n,a)=>n+a.potentialCents,0)+sum(entries.filter(e=>e.status==='open'&&e.recognition==='forecast')),receivableCents:sum(entries.filter(e=>e.status==='open'&&e.recognition==='recognized')),receivedCents:sum(entries.filter(e=>e.status==='settled'))}};
}
