import {fields,fail,text} from './cloud/domain.mjs';
export function accessChange(actor,member,body){
 fields(body,['name','role','active','expected']);
 if(body.active!==undefined&&typeof body.active!=='boolean')fail(400,'Situação inválida.');
 if(!member)fail(404,'Pessoa não encontrada.');
 if(body.expected){fields(body.expected,['name','role','active']);for(const k of ['name','role','active'])if(body.expected[k]!==member[k])fail(409,'O acesso foi alterado. Reabra o cadastro antes de salvar.');}
 const name=body.name===undefined?member.name:text(body.name,2,80),role=body.role??member.role,active=body.active??member.active;
 if(!['admin','corretor'].includes(role)||typeof active!=='boolean')fail(400,'Confira a permissão e a situação do acesso.');
 if(actor.id===member.id&&(!active||role!==member.role))fail(400,'Você não pode suspender ou alterar a permissão da própria conta.');
 return {name,role,active};
}
