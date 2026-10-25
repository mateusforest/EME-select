export function archiveChange(user,currentVersion,body){
 const fail=(status,message)=>{throw Object.assign(new Error(message),{status});};
 if(user.role!=='admin')fail(403,'Somente a administração pode arquivar ou restaurar cadastros.');
 if(!body||Object.keys(body).some(key=>!['version','archived','confirmed'].includes(key))||typeof body.archived!=='boolean'||body.confirmed!==true)fail(400,'Confirme o arquivamento ou a restauração.');
 if(!Number.isInteger(body.version)||body.version!==currentVersion)fail(409,'O cadastro mudou. Atualize antes de continuar.');
 return body.archived;
}
