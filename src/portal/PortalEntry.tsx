import {lazy,Suspense,useState,type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {api,type TeamUser} from './api';
import TeamWorkspace from './TeamWorkspace';
import './portal.css';
import './team.css';
import './shell.css';
import './admin-refinement.css';
const ListingPreview=lazy(()=>import('./ListingPreview'));
export function PasswordForm({ onDone }: { onDone:(user:TeamUser)=>void }) {
  const [currentPassword,setCurrent]=useState(''),[newPassword,setNew]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  async function submit(event:FormEvent) {
    event.preventDefault(); setError('');
    if(newPassword!==confirm){setError('A confirmação da senha não confere.');return;}
    setBusy(true);
    try { const result=await api<{user:TeamUser}>('/auth/password','POST',{currentPassword,newPassword}); setCurrent('');setNew('');setConfirm('');onDone(result.user); }
    catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  return <form className="ps-form" onSubmit={submit}><label>Senha atual<input type="password" autoComplete="current-password" required minLength={12} maxLength={128} value={currentPassword} onChange={e=>setCurrent(e.target.value)} /></label><label>Nova senha<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={e=>setNew(e.target.value)} /></label><label>Confirme a nova senha<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirm} onChange={e=>setConfirm(e.target.value)} /></label><small>Use de 12 a 128 caracteres. As sessões anteriores serão encerradas.</small>{error&&<p className="pt-error" role="alert">{error}</p>}<button className="ps-button ps-button--primary" disabled={busy}>{busy?'Salvando…':'Atualizar senha'}<ArrowRight size={17}/></button></form>;
}
export default function PortalEntry({initialUser,onSignedOut}:{initialUser:TeamUser;onSignedOut:()=>void}) {
 const [user,setUser]=useState(initialUser);
 if(user.mustChangePassword)return <div className="select-portal pt-access"><section className="pt-access-form"><div className="pt-access-form-inner"><a href="/" className="pt-access-brand">Acesso Select</a><h1>Uma senha só sua.</h1><p>Substitua a senha inicial para começar a usar sua conta.</p><PasswordForm onDone={setUser}/><button className="ps-text-button" onClick={async()=>{await api('/auth/logout','POST');onSignedOut();}}>Sair</button></div></section></div>;
 if(/^\/acesso-select\/equipe\/previa\/[a-f0-9-]{36}$/.test(location.pathname))return <Suspense fallback={<p>Preparando anúncio…</p>}><ListingPreview/></Suspense>;
 return <TeamWorkspace user={user} onSignedOut={onSignedOut} onUserChanged={setUser}/>;
}
