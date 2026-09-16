import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, ShieldCheck, KeyRound, Users } from 'lucide-react';
import { api, ApiError, type TeamUser } from './api';
import TeamWorkspace from './TeamWorkspace';
import './portal.css';
import './team.css';
const ListingPreview = lazy(()=>import('./ListingPreview'));
// Old bookmarks enter the authenticated portal without loading prototype data.
const legacyRoute = location.pathname.match(/^\/portalselect\/demo(?:\/(.*))?$/);
if (legacyRoute) {
  const section = (legacyRoute[1] || '').replace(/\/$/, '');
  const aliases: Record<string, string> = { hoje: '', carteira: 'imoveis', atendimento: 'relacionamento' };
  const destination = aliases[section] ?? section;
  history.replaceState(history.state, '', '/portalselect' + (destination ? '/' + destination : '') + location.search + location.hash);
}
const isLocal = ['localhost','127.0.0.1','[::1]'].includes(location.hostname);
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
export default function PortalEntry() {
  const [session,setSession]=useState<{user:TeamUser|null;needsSetup:boolean;cloud?:boolean;requiresActivation?:boolean}|null>(null),[connectionError,setConnectionError]=useState(''),[serviceMissing,setServiceMissing]=useState(false),[reload,setReload]=useState(0);
  const [activationToken,setActivationToken]=useState('');
  const [name,setName]=useState(''),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  useEffect(()=>{let active=true;setConnectionError('');setServiceMissing(false);api<{user:TeamUser|null;needsSetup:boolean;cloud?:boolean;requiresActivation?:boolean}>('/auth/session').then(value=>{if(active)setSession(value);}).catch(error=>{if(active){setServiceMissing(!isLocal&&error instanceof ApiError&&error.status===404);setConnectionError(error.message);}});return()=>{active=false;};},[reload]);
  useEffect(()=>{document.title='Acesso da equipe · Portal Select';},[]);
  async function submit(event:FormEvent) {
    event.preventDefault();setError('');
    if(session?.needsSetup&&password!==confirm){setError('A confirmação da senha não confere.');return;}
    setBusy(true);
    try { const result=await api<{user:TeamUser}>(session?.needsSetup?'/auth/setup':'/auth/login','POST',{email,password,...(session?.needsSetup?{name,...(session.requiresActivation?{activationToken}:{})}:{})});setPassword('');setConfirm('');setSession({user:result.user,needsSetup:false}); }
    catch(error){setError((error as Error).message);}finally{setBusy(false);}
  }
  if(session?.user&&!session.user.mustChangePassword&&/^\/portalselect\/previa\/[a-f0-9-]{36}$/.test(location.pathname))return <Suspense fallback={<p>Preparando anúncio…</p>}><ListingPreview/></Suspense>;
  if(session?.user&&!session.user.mustChangePassword)return <TeamWorkspace user={session.user} onSignedOut={()=>{setSession({user:null,needsSetup:false});setError('');}} onUserChanged={user=>setSession({user,needsSetup:false})}/>;
  return <div className="select-portal pt-access"><section className="pt-access-story"><a href="/#/" className="pt-access-brand"><img src="/assets/brand-marble-monogram.png" alt="EME Select"/><span>PORTAL SELECT</span></a><div><span className="ps-overline">O ESPAÇO DA NOSSA EQUIPE</span><h1>Um olhar atento.<br/><em>Em cada detalhe.</em></h1><p>Organize os primeiros imóveis, acompanhe cada avaliação e construa o padrão EME com a sua equipe.</p><div className="pt-access-features"><span><ClipboardSymbol/>Cadastros acompanhados</span><span><Users size={16}/>Responsabilidades claras</span><span><ShieldCheck size={16}/>Histórico de cada decisão</span></div></div><a href="/#/">Voltar ao site <ArrowUpRight size={15}/></a></section><section className="pt-access-form"><div className="pt-access-form-inner"><span className="pt-lock"><KeyRound size={22}/></span><span className="ps-overline">{isLocal?'ACESSO LOCAL DA EQUIPE':'ACESSO DA EQUIPE'}</span>
    {connectionError?<><h2>{serviceMissing?'O portal online está em preparação.':'Vamos reconectar.'}</h2><p className="pt-error" role="alert">{serviceMissing?'Não foi possível acessar o serviço da equipe neste endereço. Tente novamente ou procure o administrador da EME.':connectionError}</p><button className="ps-button" onClick={()=>setReload(value=>value+1)}>Tentar novamente</button></>:!session?<><h2>Preparando seu espaço.</h2><p role="status">Verificando o acesso…</p></>:session.user?.mustChangePassword?<><h2>Uma senha só sua.</h2><p>Substitua a senha inicial para começar a usar sua conta.</p><PasswordForm onDone={user=>setSession({user,needsSetup:false})}/></>:<><h2>{session.needsSetup?'Seu acesso começa aqui.':'Bem-vindo de volta.'}</h2><p>{session.needsSetup?'Crie a conta do administrador autorizado. Depois, você poderá adicionar as pessoas da equipe.':'Entre com sua conta para acompanhar a operação.'}</p><form className="ps-form" onSubmit={submit}>{session.needsSetup&&<label>Seu nome<input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={e=>setName(e.target.value)}/></label>}<>{session?.needsSetup&&session.requiresActivation&&<label>Código privado de ativação<input required type="password" autoComplete="off" value={activationToken} onChange={e=>setActivationToken(e.target.value)}/></label>}</><label>E-mail<input required type="email" maxLength={180} autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input required type="password" minLength={session.needsSetup?12:1} maxLength={128} autoComplete={session.needsSetup?'new-password':'current-password'} value={password} onChange={e=>setPassword(e.target.value)}/></label>{session.needsSetup&&<><label>Confirme sua senha<input required type="password" minLength={12} maxLength={128} autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></label><small>Use de 12 a 128 caracteres. Esta configuração inicial acontece apenas uma vez.</small></>}{error&&<p className="pt-error" role="alert">{error}</p>}<button className="ps-button ps-button--primary" disabled={busy}>{busy?'Aguarde…':session.needsSetup?'Criar meu acesso':'Entrar no portal'}<ArrowRight size={17}/></button></form></>}
    <small className="pt-local-note">{isLocal?'Esta instalação funciona neste computador. Use sua conta individual para acessar os cadastros da equipe.':'Acesso individual da equipe. Seus registros e permissões são os mesmos em todas as áreas do portal.'}</small></div></section></div>;
}
function ClipboardSymbol(){return <ShieldCheck size={16}/>;}
