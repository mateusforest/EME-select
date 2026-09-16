import {applyFinanceCommand} from '../../shared/finance.mjs';
import {financeEnvelope, financeFingerprint, financeStateSize, financeAdmin} from '../finance.mjs';

export function attachCloudFinance({client,hashOf}) {
  const {rest,rpc}=client;
  const metadata=async()=>{
    const [members,properties]=await Promise.all([
      rest('eme_profiles?select=id,name,role,active&order=name'),
      rest('eme_cases?select=id,data->>title&order=created_at.desc'),
    ]);
    return {members,properties:properties.map(item=>({id:item.id,title:item.title||'Imóvel sem título'}))};
  };
  const row=async()=>{
    const value=(await rest('eme_finance_state?id=eq.company&select=version,data,updated_at'))[0];
    if(!value){const error=new Error('A central financeira ainda não foi ativada no servidor.');error.status=503;throw error;}
    return value;
  };
  const snapshot=async()=>{
    const [current,meta,history]=await Promise.all([row(),metadata(),rest('eme_finance_audit?select=id,action,state_version,created_at,eme_profiles(name)&order=id.desc&limit=100')]);
    return {version:current.version,state:current.data,updatedAt:current.updated_at,...meta,history:history.map(item=>({id:item.id,action:item.action,version:item.state_version,createdAt:item.created_at,author:item.eme_profiles?.name||'Administrador'}))};
  };
  async function handle(path,req,res,user,body,send) {
    if(path!=='/api/finance'&&path!=='/api/finance/commands')return false;
    financeAdmin(user);
    if(path==='/api/finance'&&req.method==='GET'){send(200,await snapshot());return true;}
    if(path!=='/api/finance/commands'||req.method!=='POST'){const error=new Error('Operação financeira indisponível.');error.status=405;throw error;}
    const input=financeEnvelope(body);
    // Read the receipt first: a network retry must not recompute a settled command.
    // The RPC repeats this check while holding the singleton lock.
    const receipt=(await rest('eme_finance_receipts?request_id=eq.'+input.requestId+'&select=payload_hash,actor_id'))[0];
    if(receipt){
      if(receipt.payload_hash!==input.fingerprint||receipt.actor_id!==user.id){const error=new Error('Esta referência já foi usada em outro lançamento. Atualize a tela.');error.status=409;throw error;}
      send(200,await snapshot());return true;
    }
    const [current,meta]=await Promise.all([row(),metadata()]);
    if(current.version<input.version){const error=new Error('O financeiro mudou. Atualize a tela antes de salvar.');error.status=409;throw error;}
    // A retry can miss the receipt and then read the already-committed state.
    // Let the locked RPC resolve that case. A null proposal can never be saved;
    // it only allows the receipt check to run before STALE_VERSION is returned.
    const next=current.version===input.version ? applyFinanceCommand(current.data,input.command,{...meta,actorId:user.id,now:new Date().toISOString()}) : null;
    if(next)financeStateSize(next);
    await rpc('eme_save_finance',{p_session:hashOf(req),p_version:input.version,p_request_id:input.requestId,p_payload_hash:input.fingerprint,p_command:input.command,p_data:next,p_before_hash:financeFingerprint(current.data),p_after_hash:financeFingerprint(next)});
    send(200,await snapshot());return true;
  }
  return {handle};
}
