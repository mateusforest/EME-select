import test from 'node:test';
import assert from 'node:assert/strict';
import {attachUnifiedChannel} from '../server/cloud/unified-channel.mjs';
test('group registration isolates state, validates group and actor, and keeps internal queries private',async()=>{
 let linked=true;const actor={id:'actor',name:'Equipe',active:true,must_change:false,role:'corretor'};
 const client={rest:async path=>path.startsWith('eme_staff_wa_links')?(linked?[{user_id:'actor'}]:[]):[actor],rpc:async()=>{throw Error('Private conversation must not be touched');}};
 const token='x'.repeat(64),bridge=attachUnifiedChannel({client,ai:{},env:{EME_STAFF_WHATSAPP_ENABLED:'true',EME_STAFF_WHATSAPP_TOKEN:token}}).bridge;
 const req={method:'POST',headers:{authorization:'Bearer '+token}},base={phone:'5554984007919',sessionId:'eme-oficial-8029',groupId:'120363430024608861@g.us',messageId:'group-test',text:'CADASTRAR IMÓVEL'};
 let output;await bridge('/api/integrations/eme-channel/message',req,base,(_,r)=>output=r);
 assert.equal(output.groupState.flow.kind,'property');assert.equal(output.groupState.flow.actorId,'actor');assert.match(output.reply,/título/);
 await bridge('/api/integrations/eme-channel/message',req,{...base,text:'CONSULTAR FINANCEIRO'},(_,r)=>output=r);assert.match(output.reply,/privado/);
 await assert.rejects(bridge('/api/integrations/eme-channel/message',req,{...base,groupId:'other@g.us'},()=>{}),e=>e.status===403);
 linked=false;await assert.rejects(bridge('/api/integrations/eme-channel/message',req,base,()=>{}),e=>e.status===403);
});
