export const approvalStatus=data=>['approved','rejected','suspended'].includes(data?.approval?.status)?data.approval.status:'pending';
export function validDocument(value){
 const digits=String(value||'').replace(/\D/g,'');if(![11,14].includes(digits.length)||/^(\d)\1+$/.test(digits))return false;
 const digit=(values,weights)=>{const rest=values.reduce((sum,n,i)=>sum+n*weights[i],0)%11;return rest<2?0:11-rest;};
 const a=[...digits].map(Number),cpf=a.length===11;
 const weights=cpf?[10,9,8,7,6,5,4,3,2]:[5,4,3,2,9,8,7,6,5,4,3,2];
 const first=digit(a.slice(0,-2),weights),second=digit([...a.slice(0,-2),first],cpf?[11,...weights]:[6,...weights]);return a.at(-2)===first&&a.at(-1)===second;
}
export const cleanPhone=value=>{let phone=String(value||'').replace(/\D/g,'');if(phone.length===10||phone.length===11)phone='55'+phone;return /^55[1-9]{2}[0-9]{8,9}$/.test(phone)?phone:null;};
