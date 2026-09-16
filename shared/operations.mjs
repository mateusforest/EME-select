import { percentCents } from './finance.mjs'
export class OperationsError extends Error { constructor(message,status=400,code='invalid_operation'){super(message);this.status=status;this.code=code;this.name='OperationsError'} }
const fail=(message,status=400)=>{throw new OperationsError(message,status)}
const uid=value=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(value)?value.toLowerCase():fail('Identificador inválido.')
const fresh=value=>value?uid(value):globalThis.crypto.randomUUID()
const text=(value,label,max=160,min=2)=>{const result=typeof value==='string'?value.trim():'';if(result.length<min||result.length>max)fail(`${label}: informe entre ${min} e ${max} caracteres.`);return result}
const optional=(value,label,max=2000)=>text(value,label,max,0)
const choose=(value,list,label)=>list.includes(value)?value:fail(`${label}: opção inválida.`)
const integer=(value,label,min=0,max=1e12)=>Number.isSafeInteger(value)&&value>=min&&value<=max?value:fail(`${label}: valor inteiro inválido.`)
const date=(value,label='Data')=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value<'1900-01-01'||value>'2200-12-31'||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value)fail(`${label}: data inválida.`);return value}
const instant=(value,label='Data e hora')=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value)))fail(`${label}: informe data e hora com fuso.`);date(value.slice(0,10),label);return new Date(value).toISOString()}
const past=(value,context,label='Data real')=>{const result=instant(value,label);if(result>context.now)fail(`${label} não pode estar no futuro.`);return result}
const phone=value=>{const result=optional(value,'Telefone',24);if(result&&!/^\+?[\d\s().-]{8,24}$/.test(result))fail('Informe um telefone válido.');return result}
const get=(rows,id,label='Registro')=>rows.find(row=>row.id===uid(id))||fail(`${label} não encontrado.`,404)
const put=(rows,item)=>{const index=rows.findIndex(row=>row.id===item.id);if(index<0)rows.push(item);else rows[index]=item}
const meta=(prior,context)=>({id:prior?.id||fresh(),createdAt:prior?.createdAt||context.now,updatedAt:context.now,createdBy:prior?.createdBy||context.actorId})
const member=(value,context,prior=null)=>{const id=uid(value);if(id===prior)return id;const row=context.members.find(item=>item.id===id&&item.active!==false);if(!row)fail('Selecione uma pessoa ativa cadastrada.');if(context.role!=='admin'&&id!==context.actorId)fail('O corretor deve registrar a si como responsável.',403);return id}
const caseFor=(id,context)=>{const item=context.properties.find(row=>row.id===uid(id));if(!item||context.role!=='admin'&&item.assigneeId!==context.actorId)fail('Este imóvel não está disponível na sua carteira.',403);return item}
const collections={ticket:'tickets',visit:'visits',key:'visits',lease:'leases',document:'documents',review:'reviews'}
const adminActions=new Set(['visit.confirm','key.authorize','lease.end','lease.cancel_charge','document.review','review.save'])
const commands=new Set(['ticket.save','ticket.message','visit.save','visit.confirm','visit.cancel','visit.complete','key.request','key.authorize','key.pickup','key.return','lease.save','lease.end','lease.generate','lease.receive','lease.repass','lease.cancel_charge','lease.maintenance','lease.inspection','document.upload','document.review','review.save'])
export function emptyOperations(){return {version:1,tickets:[],visits:[],leases:[],documents:[],reviews:[]}}
export function operationsScope(state,command,context){
 if(!command||!commands.has(command.type)||!command.data||typeof command.data!=='object'||Array.isArray(command.data))fail('Comando operacional inválido.')
 if(!['admin','corretor'].includes(context.role))fail('Acesso não permitido.',403)
 const adminOnly=adminActions.has(command.type);if(adminOnly&&context.role!=='admin')fail('Esta ação exige autorização de um administrador EME.',403)
 if(command.type==='review.save')return {propertyId:null,adminOnly:true}
 const data=command.data,rows=state[collections[command.type.split('.')[0]]]
 const prior=data.id?rows.find(row=>row.id===uid(data.id)):null
 const propertyId=prior?.propertyId||data.propertyId
 caseFor(propertyId,context)
 if(prior&&data.propertyId&&data.propertyId!==prior.propertyId)fail('O vínculo com o imóvel não pode ser alterado.')
 return {propertyId,adminOnly}
}
const keyEmpty=()=>({status:'none',authorizedAt:null,authorizedBy:null,returnDueAt:null,pickedUpAt:null,returnedAt:null,custodianName:'',identityReference:'',notes:''})
const overlap=(start,end,otherStart,otherEnd)=>start<otherEnd&&end>otherStart
export function applyOperationsCommand(input,command,rawContext){
 if(input?.version!==1)fail('Versão de operações inválida.')
 const context={...rawContext,now:instant(rawContext.now)};uid(context.actorId)
 const scope=operationsScope(input,command,context),state=structuredClone(input),data=command.data,type=command.type
 const collection=collections[type.split('.')[0]],rows=state[collection],prior=data.id?rows.find(item=>item.id===uid(data.id)):null,merged={...prior,...data}
 const update=(item)=>put(rows,{...item,updatedAt:context.now})
 if(type==='ticket.save'){
  const status=choose(merged.status||'new',['new','in_progress','waiting','closed'],'Etapa')
  const item={...meta(prior,context),id:prior?.id||fresh(data.id),propertyId:scope.propertyId,title:text(merged.title,'Assunto'),contactName:text(merged.contactName,'Nome do contato'),contactPhone:phone(merged.contactPhone),channel:choose(merged.channel||'whatsapp',['whatsapp','phone','email','site','in_person','other'],'Canal'),status,assigneeId:member(merged.assigneeId||context.actorId,context,prior?.assigneeId),priority:choose(merged.priority||'normal',['normal','high'],'Prioridade'),nextContactAt:merged.nextContactAt?instant(merged.nextContactAt,'Próximo contato'):null,notes:optional(merged.notes,'Observações'),messages:prior?.messages||[]}
  if(status!=='closed'&&!item.nextContactAt)fail('Defina o próximo contato para manter o acompanhamento.')
  update(item)
 }else if(type==='ticket.message'){
  const item=get(rows,data.id,'Atendimento');if(item.messages.length>=1000)fail('Este atendimento atingiu o limite de registros. Abra um novo atendimento vinculado.')
  item.messages.push({id:fresh(),direction:choose(data.direction,['received','sent','internal'],'Tipo de registro'),body:text(data.body,'Conteúdo',4000),occurredAt:past(data.occurredAt||context.now,context),createdAt:context.now,createdBy:context.actorId});update(item)
 }else if(type==='visit.save'){
  if(prior&&['completed','cancelled'].includes(prior.status))fail('Uma visita encerrada não pode ser editada.')
  if(prior&&['out','returned'].includes(prior.key.status))fail('A visita com custódia registrada preserva seu histórico; agende uma nova visita.')
  const startAt=instant(merged.startAt,'Início'),endAt=instant(merged.endAt,'Término'),brokerId=member(merged.brokerId||context.actorId,context,prior?.brokerId)
  if(startAt>=endAt||Date.parse(endAt)-Date.parse(startAt)>12*60*60*1000)fail('A visita precisa durar entre um minuto e doze horas.')
  if(Date.parse(endAt)-Date.parse(startAt)<60000)fail('A visita precisa durar ao menos um minuto.')
  if(state.visits.some(item=>item.id!==prior?.id&&['requested','confirmed'].includes(item.status)&&(item.propertyId===scope.propertyId||item.brokerId===brokerId)&&overlap(startAt,endAt,item.startAt,item.endAt)))fail('Há uma visita nesse horário para o imóvel ou para o corretor.',409)
  update({...meta(prior,context),id:prior?.id||fresh(data.id),propertyId:scope.propertyId,brokerId,visitorName:text(merged.visitorName,'Nome do visitante'),visitorPhone:phone(merged.visitorPhone),startAt,endAt,status:'requested',notes:optional(merged.notes,'Observações'),cancelReason:null,key:keyEmpty()})
 }else if(type.startsWith('visit.')||type.startsWith('key.')){
  const item=get(rows,data.id,'Visita')
  if(['cancelled','completed'].includes(item.status))fail('Esta visita já foi encerrada.')
  if(type==='visit.confirm'){item.status='confirmed'}
  else if(type==='visit.cancel'){if(item.key.status==='out')fail('Registre a devolução da chave antes de cancelar a visita.');item.status='cancelled';item.cancelReason=text(data.reason,'Motivo do cancelamento',600)}
  else if(type==='visit.complete'){if(item.status!=='confirmed')fail('Confirme a visita antes de concluir.');if(item.startAt>context.now)fail('A visita ainda não começou.');if(item.key.status==='out')fail('Registre a devolução da chave antes de concluir.');item.status='completed';item.notes=text(data.notes,'Registro da visita',2000)}
  else if(type==='key.request'){if(!['none','requested'].includes(item.key.status))fail('A chave já possui autorização ou custódia.');item.key.status='requested'}
  else if(type==='key.authorize'){if(item.status!=='confirmed'||!['requested','authorized'].includes(item.key.status))fail('Confirme a visita e registre a solicitação da chave antes de autorizar.');const returnDueAt=instant(data.returnDueAt,'Devolução prevista');if(returnDueAt<item.endAt||returnDueAt<=context.now)fail('A devolução prevista deve ser futura e posterior à visita.');item.key={...item.key,status:'authorized',authorizedAt:context.now,authorizedBy:context.actorId,returnDueAt,notes:text(data.notes,'Condições da autorização',1000)}}
  else if(type==='key.pickup'){if(item.status!=='confirmed'||item.key.status!=='authorized')fail('A retirada exige visita confirmada e autorização expressa da EME.');const occurredAt=past(data.occurredAt,context,'Retirada');if(occurredAt<item.key.authorizedAt||occurredAt>item.key.returnDueAt)fail('A retirada está fora do período autorizado.');item.key={...item.key,status:'out',pickedUpAt:occurredAt,custodianName:text(data.custodianName,'Responsável pela chave'),identityReference:text(data.identityReference,'Referência da conferência de identidade',120),notes:optional(data.notes,'Registro da retirada',1000)}}
  else if(type==='key.return'){if(item.key.status!=='out')fail('Não há retirada em aberto para esta visita.');const occurredAt=past(data.occurredAt,context,'Devolução');if(occurredAt<item.key.pickedUpAt)fail('A devolução não pode anteceder a retirada.');item.key={...item.key,status:'returned',returnedAt:occurredAt,notes:text(data.notes,'Conferência da devolução',1000)}}
  update(item)
 }else if(type==='lease.save'){
  if(prior?.status==='ended')fail('Contrato encerrado preserva seu cadastro; registre um novo contrato.')
  const startDate=date(merged.startDate,'Início do contrato'),endDate=date(merged.endDate,'Fim do contrato')
  if(startDate>endDate)fail('O fim do contrato não pode anteceder o início.')
  if(state.leases.some(item=>item.id!==prior?.id&&item.propertyId===scope.propertyId&&item.status==='active'&&startDate<=item.endDate&&endDate>=item.startDate))fail('Já existe contrato ativo nesse período para este imóvel.',409)
  update({...meta(prior,context),id:prior?.id||fresh(data.id),propertyId:scope.propertyId,ownerName:text(merged.ownerName,'Proprietário'),ownerPhone:phone(merged.ownerPhone),tenantName:text(merged.tenantName,'Locatário'),tenantPhone:phone(merged.tenantPhone),startDate,endDate,rentCents:integer(merged.rentCents,'Aluguel',1),managementBps:integer(merged.managementBps,'Honorários',0,10000),dueDay:integer(merged.dueDay,'Dia do vencimento',1,28),status:'active',endReason:null,notes:optional(merged.notes,'Observações'),charges:prior?.charges||[],maintenance:prior?.maintenance||[],inspections:prior?.inspections||[]})
 }else if(type.startsWith('lease.')){
  const item=get(rows,data.id,'Contrato')
  if(type==='lease.end'){if(item.status==='ended')fail('O contrato já está encerrado.');item.status='ended';item.endReason=text(data.reason,'Motivo do encerramento',600)}
  else if(type==='lease.generate'){
   if(item.status!=='active')fail('O contrato está encerrado.')
   const month=data.month;date(`${month}-01`,'Competência');if(month<item.startDate.slice(0,7)||month>item.endDate.slice(0,7))fail('Competência fora da vigência do contrato.')
   if(item.charges.some(charge=>charge.month===month))return state
   const rentCents=integer(data.rentCents??item.rentCents,'Aluguel da competência',1),feeCents=percentCents(rentCents,item.managementBps)
   item.charges.push({...meta(null,context),month,rentCents,feeCents,ownerDueCents:rentCents-feeCents,dueDate:`${month}-${String(item.dueDay).padStart(2,'0')}`,status:'open',receivedAt:null,repassedAt:null,notes:''})
  }else if(['lease.receive','lease.repass','lease.cancel_charge'].includes(type)){
   const charge=get(item.charges,data.chargeId,'Competência')
   if(type==='lease.cancel_charge'){if(charge.status!=='open')fail('Só uma competência em aberto pode ser cancelada.');charge.status='cancelled';charge.notes=text(data.reason,'Motivo do cancelamento',600)}
   else {const received=type==='lease.receive';if(charge.status!==(received?'open':'received'))fail(received?'A competência não está em aberto.':'Registre o recebimento antes do repasse.');const occurredAt=past(data.occurredAt,context);if(!received&&occurredAt<charge.receivedAt)fail('O repasse não pode anteceder o recebimento.');charge.status=received?'received':'repassed';charge[received?'receivedAt':'repassedAt']=occurredAt;charge.notes=text(data.notes,'Comprovante e observações',1200)}
   charge.updatedAt=context.now
  }else if(type==='lease.maintenance'){
   const old=data.itemId?get(item.maintenance,data.itemId,'Manutenção'):null,status=choose(data.status||'open',['open','in_progress','resolved'],'Etapa')
   put(item.maintenance,{...meta(old,context),title:text(data.title,'Título'),description:text(data.description,'Descrição',2000),status,estimatedCostCents:data.estimatedCostCents==null?null:integer(data.estimatedCostCents,'Estimativa'),actualCostCents:data.actualCostCents==null?null:integer(data.actualCostCents,'Custo real'),notes:optional(data.notes,'Observações'),reportedAt:old?.reportedAt||context.now,resolvedAt:status==='resolved'?old?.resolvedAt||context.now:null})
  }else if(type==='lease.inspection'){
   const old=data.itemId?get(item.inspections,data.itemId,'Vistoria'):null,result=choose(data.result||'pending',['pending','adequate','action_required'],'Resultado'),completedAt=data.completedAt?past(data.completedAt,context,'Vistoria realizada'):null
   if(result!=='pending'&&!completedAt)fail('Informe quando a vistoria foi realizada.');if(result==='pending'&&completedAt)fail('Uma vistoria realizada precisa de resultado.')
   put(item.inspections,{...meta(old,context),kind:choose(data.kind,['entry','periodic','exit'],'Tipo de vistoria'),scheduledAt:instant(data.scheduledAt,'Vistoria agendada'),completedAt,result,notes:result==='pending'?optional(data.notes,'Observações'):text(data.notes,'Registro da vistoria',2000)})
  }
  update(item)
 }else if(type==='document.upload'){
  if(prior)fail('Um arquivo existente não pode ser substituído. Envie uma nova versão.',409)
  const file=context.file;if(!file||!['application/pdf','image/png','image/jpeg','image/webp'].includes(file.mimeType)||!Number.isInteger(file.sizeBytes)||file.sizeBytes<1||file.sizeBytes>2097152||!/^[a-f0-9]{64}$/.test(file.sha256))fail('Envie um PDF, PNG, JPEG ou WebP válido de até 2 MiB.')
  const previous=data.previousId?get(state.documents,data.previousId,'Documento anterior'):null,category=choose(data.category,['authorization','ownership','contract','inspection','other'],'Categoria')
  if(previous&&(previous.propertyId!==scope.propertyId||previous.category!==category))fail('A nova versão deve pertencer ao mesmo imóvel e categoria.')
  if(previous&&state.documents.some(doc=>doc.previousId===previous.id))fail('Esse documento já tem uma versão mais recente.',409)
  update({...meta(null,context),id:fresh(data.id),propertyId:scope.propertyId,title:text(data.title,'Título'),category,filename:file.filename,mimeType:file.mimeType,sizeBytes:file.sizeBytes,sha256:file.sha256,version:previous?previous.version+1:1,previousId:previous?.id||null,expiresOn:data.expiresOn?date(data.expiresOn,'Validade'):null,status:'pending',reviewNotes:'',reviewedAt:null,reviewedBy:null})
 }else if(type==='document.review'){
  const item=get(rows,data.id,'Documento');item.status=choose(data.status,['approved','rejected'],'Revisão');item.reviewNotes=text(data.notes,'Parecer da revisão',2000);item.reviewedAt=context.now;item.reviewedBy=context.actorId;update(item)
 }else if(type==='review.save'){
  const scores={};for(const key of ['communication','followup','reliability','presentation'])scores[key]=merged.scores?.[key]==null?null:integer(merged.scores[key],'Nota',0,5)
  const status=choose(merged.status||'draft',['draft','complete'],'Etapa'),periodStart=date(merged.periodStart,'Período inicial'),periodEnd=date(merged.periodEnd,'Período final'),evidence=optional(merged.evidence,'Evidências',4000),actionPlan=optional(merged.actionPlan,'Plano de ação',4000)
  if(periodStart>periodEnd)fail('Período de avaliação inválido.');if(status==='complete'&&(Object.values(scores).some(score=>score===null)||evidence.length<30||actionPlan.length<10))fail('Para concluir, informe quatro notas, evidências concretas e um plano de ação.')
  update({...meta(prior,context),id:prior?.id||fresh(data.id),brokerId:member(merged.brokerId,context,prior?.brokerId),periodStart,periodEnd,scores,evidence,actionPlan,status})
 }
 return state
}
export function visibleOperations(state,context){if(context.role==='admin')return structuredClone(state);const allowed=new Set(context.properties.filter(item=>item.assigneeId===context.actorId).map(item=>item.id));return {...state,...Object.fromEntries(['tickets','visits','leases','documents'].map(key=>[key,structuredClone(state[key].filter(item=>allowed.has(item.propertyId)))])),reviews:[]}}
export function operationsMetrics(state,asOf){const now=instant(asOf),ids=[...new Set([...state.tickets.map(item=>item.assigneeId),...state.visits.map(item=>item.brokerId)])];return {brokers:ids.map(id=>({id,tickets:state.tickets.filter(item=>item.assigneeId===id).length,openTickets:state.tickets.filter(item=>item.assigneeId===id&&item.status!=='closed').length,overdueFollowups:state.tickets.filter(item=>item.assigneeId===id&&item.status!=='closed'&&item.nextContactAt&&item.nextContactAt<now).length,visits:state.visits.filter(item=>item.brokerId===id).length,completedVisits:state.visits.filter(item=>item.brokerId===id&&item.status==='completed').length,cancelledVisits:state.visits.filter(item=>item.brokerId===id&&item.status==='cancelled').length})),totals:{openTickets:state.tickets.filter(item=>item.status!=='closed').length,upcomingVisits:state.visits.filter(item=>['requested','confirmed'].includes(item.status)&&item.endAt>=now).length,keysOut:state.visits.filter(item=>item.key.status==='out').length,overdueKeys:state.visits.filter(item=>item.key.status==='out'&&item.key.returnDueAt<now).length,activeLeases:state.leases.filter(item=>item.status==='active').length,openMaintenance:state.leases.flatMap(item=>item.maintenance).filter(item=>item.status!=='resolved').length,pendingDocuments:state.documents.filter(item=>item.status==='pending').length}}}
