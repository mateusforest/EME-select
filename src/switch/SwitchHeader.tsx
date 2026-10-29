import {ArrowUpRight} from 'lucide-react';

export default function SwitchHeader(){
  return <header className="sw-header">
    <a href="/" className="sw-brand" aria-label="EME Select · início">
      <img src="/assets/experience/brand-monogram-transparent.webp" width="46" height="34" alt=""/><small>SELECT</small>
    </a>
    <nav aria-label="Navegação principal">
      <a href="/">A coleção</a><a href="/inovacao">Inovação</a><a href="/switch" aria-current="page">M Switch</a>
    </nav>
    <a className="sw-access" href="/acesso-select">Acesso Select<ArrowUpRight size={15}/></a>
  </header>;
}
