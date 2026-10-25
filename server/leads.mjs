import {createHash} from 'node:crypto';
import {leadInput,leadUpdate,routingInput,leadId,leadFail} from '../shared/leads.mjs';
export const leadHash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function createLeads({store,rate}){
 async function publicHandle(path,req,body,send){
  if(path!=='/api/public/leads')return false;if(req.method!=='POST')leadFail(405,'Envie uma solicitação.');
  if(Buffer.byteLength(JSON.stringify(body))>10000)leadFail(413,'Reduza a mensagem.');
  const input=leadInput(body);await rate(req);await store.receive(input,leadHash({propertyId:input.propertyId,data:input.data}));
  send(201,{reference:input.requestId,received:true});return true;
 }
 async function handle(path,req,user,body,send){
  if(path!=='/api/leads'&&path!=='/api/leads/settings'&&!/^\/api\/leads\/[a-f0-9-]{36}$/.test(path))return false;
  if(!user?.active||user.must_change||!['admin','corretor'].includes(user.role))leadFail(403,'Acesso não permitido.');
  if(path==='/api/leads'&&req.method==='GET'){send(200,await store.snapshot(user,new URL(req.url||path,'http://local').searchParams.get('scope')==='mine'));return true;}
  if(path==='/api/leads/settings'&&req.method==='POST'){if(user.role!=='admin')leadFail(403,'Somente a gestão altera a distribuição.');await store.settings(req,user,routingInput(body));send(200,await store.snapshot(user));return true;}
  if(req.method!=='PATCH'||path==='/api/leads')leadFail(405,'Operação indisponível.');
  await store.update(req,user,leadId(path.split('/').at(-1)),leadUpdate(body));send(200,await store.snapshot(user));return true;
 }
 return {publicHandle,handle};
}
