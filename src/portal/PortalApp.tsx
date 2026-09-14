import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Bell, CalendarDays, Check, ChevronRight, ClipboardCheck, Clock3, FileText, House, KeyRound, LayoutDashboard, Menu, MessageSquare, Plus, Search, ShieldCheck, SlidersHorizontal, Sparkles, Users, X } from 'lucide-react';
import { properties } from '../data';
import { approvalBlock, conversations, dimensions, rentals, scoreOf, stages, tasks, weights, type Evaluation, type Stage } from './model';
import { usePortal, usePortalRoute } from './usePortal';
import './portal.css';

const money = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const navigation = [
  { id: 'hoje', name: 'Visão geral', icon: LayoutDashboard, group: 'Seu espaço' },
  { id: 'avaliacoes', name: 'Avaliações', icon: ClipboardCheck },
  { id: 'carteira', name: 'Carteira de imóveis', icon: House },
  { id: 'relacionamento', name: 'Relacionamento', icon: MessageSquare },
  { id: 'locacoes', name: 'Locações', icon: KeyRound },
  { id: 'qualidade', name: 'Qualidade da equipe', icon: Users, group: 'Inteligência e gestão' },
  { id: 'inteligencia', name: 'Central de IA', icon: Sparkles },
  { id: 'padrao', name: 'Padrão de curadoria', icon: SlidersHorizontal },
];
const pageCopy: Record<string, [string, string]> = {
  hoje: ['Um olhar sobre toda a operação.', 'Prioridades claras. Cada detalhe acompanhado.'],
  avaliacoes: ['O próximo imóvel começa aqui.', 'Da primeira informação à decisão de entrada na carteira.'],
  carteira: ['Uma coleção, muitos caminhos.', 'Os 18 imóveis ilustrativos que compõem o site da EME.'],
  relacionamento: ['Toda conversa merece continuidade.', 'Contexto, cuidado e próximos passos em um só lugar.'],
  locacoes: ['Cuidar também é acompanhar.', 'Contratos, recebimentos e compromissos da administração mensal.'],
  qualidade: ['Um padrão que se constrói em equipe.', 'Evidências de atendimento para orientar e desenvolver.'],
  inteligencia: ['Inteligência em cada etapa.', 'Conheça as capacidades previstas e seus limites de atuação.'],
  padrao: ['O que faz um imóvel ser EME.', 'Uma régua proposta para calibrar com evidências e casos reais.'],
};
const capabilities = [
  { name: 'Entrada e pré-avaliação', description: 'Organiza os dados enviados e identifica o que falta.', inputs: 'Cadastro, características e fotos autorizadas.', outputs: 'Histórico inicial, inconsistências e checklist de pendências.', limits: 'Não confirma propriedade nem aceita um imóvel automaticamente.' },
  { name: 'Curadoria e mercado', description: 'Prepara uma leitura por critério, com fontes.', inputs: 'Vistoria, características conferidas e comparáveis permitidos.', outputs: 'Parecer sugerido, evidências e limitações da análise.', limits: 'A régua é experimental. A equipe valida o preço e a decisão de entrada.' },
  { name: 'Documentação', description: 'Ajuda a encontrar divergências e organizar verificações.', inputs: 'Documentos privados e consultas de fontes habilitadas.', outputs: 'Dados extraídos, cronologia e questões para o responsável jurídico.', limits: 'Não existe integração registral ou judicial ativa nesta versão.' },
  { name: 'Relacionamento', description: 'Mantém contexto e prepara o próximo atendimento.', inputs: 'Conversas profissionais autorizadas e catálogo aprovado.', outputs: 'Resumos, respostas sugeridas e encaminhamentos.', limits: 'Nenhum canal está conectado. Os textos exibidos são exemplos editoriais.' },
  { name: 'Administração de locações', description: 'Acompanha prazos, ocorrências e divergências.', inputs: 'Contrato validado, cobranças, conciliações e chamados.', outputs: 'Alertas e sugestões para o responsável.', limits: 'Não executa pagamentos. Cálculos e alçadas precisam de regras contratuais.' },
  { name: 'Qualidade do atendimento', description: 'Observa compromissos, precisão e continuidade.', inputs: 'Atendimentos registrados, tarefas e contexto da carteira.', outputs: 'Evidências e oportunidades de desenvolvimento.', limits: 'Não decide punição ou remuneração. O profissional pode contestar apontamentos.' },
];
function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'green' | 'amber' }) {
  return <span className={'ps-tag ps-tag--' + tone}><span />{children}</span>;
}
function StageTag({ stage }: { stage: Stage }) {
  return <Tag tone={stage === 'Entrada aprovada' ? 'green' : stage === 'Ajustes solicitados' ? 'amber' : 'neutral'}>{stage}</Tag>;
}
function Panel({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    el.showModal();
    return () => { el.close(); document.body.style.overflow = overflow; previous?.isConnected && previous.focus(); };
  }, []);
  return <dialog className={'ps-dialog' + (wide ? ' ps-dialog--wide' : '')} ref={ref} aria-label={title}
    onCancel={e => { e.preventDefault(); onClose(); }}
    onClick={e => { if (e.target === e.currentTarget) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <div className="ps-dialog-head"><div><span className="ps-overline">Portal Select · demonstração</span><h2>{title}</h2></div><button className="ps-icon" onClick={onClose} aria-label="Fechar painel"><X size={20} /></button></div>
    <div className="ps-dialog-body">{children}</div>
  </dialog>;
}
function Empty({ title, text }: { title: string; text: string }) {
  return <div className="ps-empty"><Search size={26} /><h3>{title}</h3><p>{text}</p></div>;
}
function EvaluationRows({ items, onOpen, compact = false }: { items: Evaluation[]; onOpen: (id: string) => void; compact?: boolean }) {
  return <div className="ps-table-scroll"><table className={'ps-table' + (compact ? ' ps-table--compact' : '')}>
    <thead><tr><th>Imóvel</th><th>Etapa</th><th>Curadoria</th>{!compact && <th>Responsável</th>}<th><span className="ps-sr-only">Abrir dossiê</span></th></tr></thead>
    <tbody>{items.map(item => <tr key={item.id}><td><button className="ps-property-cell" onClick={() => onOpen(item.id)}><img src={item.image} alt="" loading="lazy" /><span><strong>{item.title}</strong><small>{item.city} · {item.id}</small></span></button></td>
      <td><StageTag stage={item.stage} /></td><td>{scoreOf(item.scores) === null ? <span className="ps-muted">Incompleta</span> : <span className="ps-score-small">{scoreOf(item.scores)}<small>/100</small></span>}</td>
      {!compact && <td><span className="ps-assignee"><span>{item.assignee.split(' ').map(n => n[0]).join('')}</span>{item.assignee}</span></td>}
      <td><button className="ps-icon" aria-label={'Abrir dossiê de ' + item.title} onClick={() => onOpen(item.id)}><ArrowUpRight size={18} /></button></td>
    </tr>)}</tbody>
  </table></div>;
}
function NewEvaluation({ onCreate, onClose }: { onCreate: (value: Evaluation) => void; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [city, setCity] = useState('');
  const [type, setType] = useState('Casa');
  const [operation, setOperation] = useState('Venda');
  const [assignee, setAssignee] = useState('Lia Martins');
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !city.trim()) return;
    onCreate({ id: 'AV-' + crypto.randomUUID().slice(0, 6).toUpperCase(), title: title.trim(), city: city.trim(), type, operation,
      owner: 'Proprietário de exemplo', assignee, stage: 'Recebido', legal: 'Pendente', scores: [null, null, null, null],
      image: '/assets/scene-home-v2.png', received: new Date().toISOString().slice(0, 10), summary: 'Candidatura de exemplo cadastrada pela equipe. A avaliação ainda não começou.',
      pending: ['Conferir vínculo e autorização', 'Reunir características e evidências', 'Definir verificações documentais'],
      reviewed: false, history: [new Date().toLocaleDateString('pt-BR') + ' · Cadastro demonstrativo criado pela equipe'] });
  }
  return <Panel title="Nova avaliação" onClose={onClose}><p className="ps-muted">Cadastre um exemplo para experimentar a fila. Não inclua dados pessoais ou documentos reais nesta prévia.</p>
    <form className="ps-form" onSubmit={submit}>
      <label>Nome do imóvel<input required maxLength={90} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Casa junto ao parque" autoFocus /></label>
      <label>Cidade e região<input required maxLength={80} value={city} onChange={e => setCity(e.target.value)} placeholder="Ex.: Caxias do Sul · RS" /></label>
      <div className="ps-two-fields"><label>Tipo<select value={type} onChange={e => setType(e.target.value)}>{['Casa','Casa em condomínio','Apartamento','Compacto','Sala comercial','Loja','Galpão','Pavilhão','Terreno urbano','Terra agrícola'].map(value => <option key={value}>{value}</option>)}</select></label>
        <label>Finalidade<select value={operation} onChange={e => setOperation(e.target.value)}><option>Venda</option><option>Locação</option><option>Venda e locação</option></select></label></div>
      <label>Responsável de exemplo<select value={assignee} onChange={e => setAssignee(e.target.value)}><option>Lia Martins</option><option>Rafael Costa</option></select></label>
      <div className="ps-note"><ClipboardCheck size={18} /><p>O cadastro entra como recebido, sem pontuação e com verificações pendentes.</p></div>
      <button className="ps-button ps-button--primary" type="submit" disabled={!title.trim() || !city.trim()}>Criar avaliação de exemplo <ArrowRight size={17} /></button>
    </form></Panel>;
}

export default function PortalApp() {
  const { state, setState, storageError } = usePortal();
  const { page, navigate } = usePortalRoute();
  const [mobileMenu, setMobileMenu] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('Todas');
  const [tableQuery, setTableQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [newEvaluation, setNewEvaluation] = useState(false);
  const [agenda, setAgenda] = useState(false);
  const [rentalId, setRentalId] = useState<string | null>(null);
  const [capability, setCapability] = useState<number | null>(null);
  const [conversation, setConversation] = useState('c1');
  const [draft, setDraft] = useState('');
  const [note, setNote] = useState('');
  const [decisionNote, setDecisionNote] = useState('');
  const [toast, setToast] = useState('');
  const [teamMember, setTeamMember] = useState('Lia Martins');
  const [catalogType, setCatalogType] = useState('Todos');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const currentCase = state.evaluations.find(item => item.id === selected);
  const currentRental = rentals.find(item => item.id === rentalId);
  const currentConversation = conversations.find(item => item.id === conversation)!;
  const pendingCases = state.evaluations.filter(item => item.stage !== 'Entrada aprovada');
  const readyCases = state.evaluations.filter(item => item.stage === 'Aguardando decisão');
  const openTasks = tasks.filter(task => !state.done.includes(task.id));
  const copy = pageCopy[page];
  useEffect(() => { document.title = (navigation.find(item => item.id === page)?.name || 'Página não encontrada') + ' · Portal EME Select'; headingRef.current?.focus({ preventScroll: true }); }, [page]);
  useEffect(() => { setDraft(state.drafts[conversation] || ''); setNote(state.notes[conversation] || ''); }, [conversation]);
  useEffect(() => { if (!toast) return; const timeout = setTimeout(() => setToast(''), 5000); return () => clearTimeout(timeout); }, [toast]);
  useEffect(() => {
    setMobileMenu(false);
    setSelected(null); setRentalId(null); setCapability(null); setAgenda(false); setNewEvaluation(false);
  }, [page]);
  function go(next: string) { setQuery(''); navigate(next); }
  function openCase(id: string) { setDecisionNote(''); setSelected(id); }
  function patchCase(id: string, patch: Partial<Evaluation>) { setState(prev => ({ ...prev, evaluations: prev.evaluations.map(item => item.id === id ? { ...item, ...patch } : item) })); }
  function toggleTask(id: string) { setState(prev => ({ ...prev, done: prev.done.includes(id) ? prev.done.filter(value => value !== id) : [...prev.done, id] })); }
  function approve() {
    if (!currentCase || approvalBlock(currentCase)) return;
    setState(prev => ({ ...prev, evaluations: prev.evaluations.map(item => item.id === currentCase.id && !approvalBlock(item) ? { ...item, stage: 'Entrada aprovada', history: [...item.history, new Date().toLocaleDateString('pt-BR') + ' · Entrada aprovada pela equipe no exemplo; sem publicação'] } : item) }));
    setToast('Entrada aprovada no exemplo. O site público não foi alterado.');
  }
  function requestChanges() {
    if (!currentCase || decisionNote.trim().length < 8) return;
    patchCase(currentCase.id, { stage: 'Ajustes solicitados', reviewed: false, pending: [...currentCase.pending, decisionNote.trim()], history: [...currentCase.history, new Date().toLocaleDateString('pt-BR') + ' · Ajuste de exemplo registrado: ' + decisionNote.trim()] });
    setDecisionNote(''); setToast('Ajuste registrado no dossiê de exemplo. Nenhuma mensagem foi enviada.');
  }
  function saveConversation() { setState(prev => ({ ...prev, drafts: { ...prev.drafts, [conversation]: draft }, notes: { ...prev.notes, [conversation]: note } })); setToast('Rascunho e nota guardados neste navegador. Nenhuma mensagem enviada.'); }
  function TaskList({ all = false }: { all?: boolean }) {
    return <div className="ps-tasks">{(all ? tasks : openTasks.slice(0, 3)).map(task => <div className={'ps-task' + (state.done.includes(task.id) ? ' is-done' : '')} key={task.id}>
      <button className="ps-task-check" role="checkbox" aria-checked={state.done.includes(task.id)} aria-label={'Concluir tarefa: ' + task.title} onClick={() => toggleTask(task.id)}>{state.done.includes(task.id) && <Check size={13} />}</button>
      <div><button className="ps-task-title" onClick={() => { if (task.evaluation) { setAgenda(false); openCase(task.evaluation); } else { setAgenda(false); go(task.id === 't4' ? 'locacoes' : 'relacionamento'); } }}>{task.title}</button><small>{task.detail}</small></div>
      <span className={task.urgent ? 'ps-time ps-time--urgent' : 'ps-time'}>{task.time}</span>
    </div>)}{!all && openTasks.length === 0 && <p className="ps-muted">Tudo em dia neste exemplo. As tarefas concluídas estão na agenda.</p>}</div>;
  }
  const filteredCases = state.evaluations.filter(item => (filter === 'Todas' || item.stage === filter) && (item.title + ' ' + item.city + ' ' + item.id).toLocaleLowerCase('pt-BR').includes(tableQuery.toLocaleLowerCase('pt-BR')));
  const searchCases = query.trim() ? state.evaluations.filter(item => (item.title + ' ' + item.city + ' ' + item.id).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 4) : [];
  const searchPages = query.trim() ? navigation.filter(item => item.name.toLowerCase().includes(query.trim().toLowerCase())) : [];
  const taskPanel = <section className="ps-card"><div className="ps-section-head"><div><span className="ps-overline">Foco do dia</span><h2>Próximas ações</h2></div><button className="ps-text-button" onClick={() => setAgenda(true)}>Ver agenda <ArrowUpRight size={15} /></button></div><TaskList /></section>;

  return <div className="select-portal">
    <a className="ps-skip" href="#portal-conteudo">Pular para o conteúdo</a>
    {mobileMenu && <button className="ps-menu-backdrop" aria-label="Fechar navegação" onClick={() => setMobileMenu(false)} />}
    <aside className={'ps-sidebar' + (mobileMenu ? ' is-open' : '')}>
      <a href="/portalselect/demo" className="ps-brand" aria-label="Portal Select — visão geral"><img src="/assets/brand-marble-monogram.png" alt="" /><span>PORTAL<small>SELECT</small></span></a>
      <nav aria-label="Navegação do portal">{navigation.map(item => <div key={item.id}>{item.group && <p className="ps-nav-group">{item.group}</p>}<a href={item.id === 'hoje' ? '/portalselect/demo' : '/portalselect/demo/' + item.id} title={item.name} aria-current={page === item.id ? 'page' : undefined} onClick={e => { if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); go(item.id); setMobileMenu(false); }}><item.icon size={18} strokeWidth={1.65} /><span>{item.name}</span>{item.id === 'avaliacoes' && <small>{pendingCases.length}</small>}</a></div>)}</nav>
      <div className="ps-sidebar-bottom"><a href="/#/" className="ps-back-site"><ArrowUpRight size={17} /><span>Ir para o site</span></a><div className="ps-account"><span>EM</span><div><strong>Equipe EME</strong><small>Ambiente de demonstração</small></div></div></div>
    </aside>
    <div className="ps-workspace">
      <header className="ps-topbar"><div className="ps-breadcrumb"><button className="ps-icon ps-mobile-toggle" aria-label={mobileMenu ? 'Fechar navegação' : 'Abrir navegação'} aria-expanded={mobileMenu} onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button><span>Workspace</span><ChevronRight size={13} /><strong>{navigation.find(item => item.id === page)?.name || 'Portal'}</strong></div>
        <div className="ps-topbar-actions"><div className="ps-global-search"><Search size={16} /><input aria-label="Buscar no portal" placeholder="Buscar no portal" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') setQuery(''); }} />{query && <button className="ps-icon" aria-label="Limpar busca" onClick={() => setQuery('')}><X size={14} /></button>}
          {query.trim() && <div className="ps-search-results"><small>RESULTADOS</small>{searchPages.map(item => <button key={item.id} onClick={() => go(item.id)}><item.icon size={17} />{item.name}<ArrowUpRight size={14} /></button>)}{searchCases.map(item => <button key={item.id} onClick={() => { setQuery(''); openCase(item.id); }}><House size={17} /><span>{item.title}<small>{item.city}</small></span><ArrowUpRight size={14} /></button>)}{!searchCases.length && !searchPages.length && <p>Nenhum resultado. Tente o nome do imóvel ou de uma área.</p>}</div>}</div>
          <button className="ps-icon ps-bell" aria-label={'Ver ' + openTasks.length + ' tarefas pendentes'} onClick={() => setAgenda(true)}><Bell size={19} />{openTasks.length > 0 && <i />}</button><span className="ps-avatar">EM</span></div>
      </header>
      <div className="ps-demo-bar"><span><span className="ps-demo-dot" />Prévia funcional <b>·</b> Dados fictícios</span><span>Alterações neste navegador <b>·</b> IA ainda não conectada</span></div>
      {storageError && <div role="alert" className="ps-storage-error">{storageError}</div>}
      <main id="portal-conteudo" className="ps-main">
        <div className="ps-page-heading"><div><span className="ps-overline">{page === 'hoje' ? 'DOMINGO, 13 DE SETEMBRO · CENÁRIO DE EXEMPLO' : 'EME SELECT / ' + (navigation.find(item => item.id === page)?.name.toUpperCase() || 'PORTAL')} </span><h1 tabIndex={-1} ref={headingRef}>{copy?.[0] || 'Este caminho ainda não existe.'}</h1><p>{copy?.[1] || 'Escolha uma área do portal para continuar.'}</p></div>
          {(page === 'hoje' || page === 'avaliacoes') && <button className="ps-button ps-button--primary" onClick={() => setNewEvaluation(true)} disabled={state.evaluations.length >= 200}><Plus size={17} />Nova avaliação</button>}
        </div>

        {page === 'hoje' && <>
          <section className="ps-stats" aria-label="Resumo da operação demonstrativa">
            {[{ label: 'Em avaliação', value: pendingCases.length, note: readyCases.length + ' aguardando decisão', icon: ClipboardCheck, target: 'avaliacoes' }, { label: 'Na coleção', value: properties.length, note: 'Imóveis do acervo ilustrativo', icon: House, target: 'carteira' }, { label: 'Contratos de locação', value: rentals.length, note: 'Carteira de exemplo', icon: KeyRound, target: 'locacoes' }, { label: 'Conversas em foco', value: conversations.length, note: 'Históricos demonstrativos', icon: MessageSquare, target: 'relacionamento' }].map(stat => <button key={stat.label} className="ps-stat" onClick={() => go(stat.target)}><div><span>{stat.label}</span><stat.icon size={19} strokeWidth={1.5} /></div><strong>{String(stat.value).padStart(2, '0')}</strong><small>{stat.note}<ArrowUpRight size={14} /></small></button>)}
          </section>
          <div className="ps-overview-grid"><div className="ps-overview-main">{taskPanel}<section className="ps-card ps-evaluation-card"><div className="ps-section-head"><div><span className="ps-overline">Da entrada à escolha</span><h2>Em curadoria</h2></div><button className="ps-text-button" onClick={() => go('avaliacoes')}>Ver avaliações <ArrowUpRight size={15} /></button></div><EvaluationRows items={pendingCases.slice(0, 4)} onOpen={openCase} compact />{!pendingCases.length && <Empty title="Fila concluída" text="Cadastre um novo exemplo para experimentar a curadoria." />}</section></div>
            <div className="ps-overview-side"><section className="ps-intelligence-card"><div className="ps-intelligence-top"><span className="ps-ai-symbol"><Sparkles size={21} strokeWidth={1.4} /></span><Tag>Em preparação</Tag></div><span className="ps-overline">INTELIGÊNCIA EME</span><h2>Um segundo olhar.<br /><em>Em cada decisão.</em></h2><p>Uma visão do que a IA poderá organizar para a equipe.</p><div className="ps-ai-example"><span>EXEMPLO DE LEITURA</span><p>O apartamento Mont’Serrat tem as verificações do exemplo concluídas. A revisão de entrada está com a equipe.</p></div><button onClick={() => go('inteligencia')}>Conhecer a central <ArrowRight size={18} /></button></section>
              <section className="ps-card ps-pipeline"><div className="ps-section-head"><div><span className="ps-overline">MOVIMENTO DA CARTEIRA</span><h2>Etapas da curadoria</h2></div></div>{stages.map(stage => { const count = state.evaluations.filter(item => item.stage === stage).length; return <button key={stage} onClick={() => { setFilter(stage); go('avaliacoes'); }}><span>{stage}<b>{count}</b></span><i><span style={{ width: (state.evaluations.length ? count / state.evaluations.length * 100 : 0) + '%' }} /></i></button>; })}<small>Distribuição dos exemplos desta prévia.</small></section></div>
          </div>
          <div className="ps-bottom-note"><ShieldCheck size={16} /><span>Decisões com evidências. Pessoas nos momentos importantes.</span><a href="/#/">Explorar o site <ArrowUpRight size={14} /></a></div>
        </>}

        {page === 'avaliacoes' && <section className="ps-card ps-list-card"><div className="ps-list-toolbar"><div className="ps-filter-search"><Search size={17} /><input aria-label="Buscar avaliações" value={tableQuery} placeholder="Nome, cidade ou protocolo" onChange={e => setTableQuery(e.target.value)} /></div><label className="ps-inline-select">Etapa<select value={filter} onChange={e => setFilter(e.target.value)}><option>Todas</option>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label><span className="ps-muted">{filteredCases.length} avaliações</span></div><EvaluationRows items={filteredCases} onOpen={openCase} />{!filteredCases.length && <Empty title="Nenhuma avaliação encontrada" text="Altere a etapa ou tente outra busca." />}<div className="ps-card-foot">A nota de curadoria não substitui a verificação documental. Régua experimental.</div></section>}

        {page === 'carteira' && <><div className="ps-chips" aria-label="Filtrar carteira por finalidade">{['Todos','Comprar','Alugar'].map(value => <button key={value} aria-pressed={catalogType === value} className={catalogType === value ? 'is-active' : ''} onClick={() => setCatalogType(value)}>{value}</button>)}</div><div className="ps-property-grid">{properties.filter(p => catalogType === 'Todos' || p.operation === (catalogType === 'Comprar' ? 'comprar' : 'alugar')).map(p => <article className="ps-property-card" key={p.id}><a href={'/#/imovel/' + p.id}><img loading="lazy" src={p.image} alt={'Cenário ilustrativo de ' + p.title} /></a><div><span className="ps-overline">{p.type} · {p.operation === 'comprar' ? 'Venda' : 'Locação'}</span><h2>{p.title}</h2><p>{p.location}</p><footer><strong>{money(p.price)}{p.operation === 'alugar' && <small>/mês</small>}</strong><a className="ps-icon" aria-label={'Ver ' + p.title + ' no site'} href={'/#/imovel/' + p.id}><ArrowUpRight size={19} /></a></footer></div></article>)}</div></>}

        {page === 'relacionamento' && <section className="ps-inbox ps-card"><aside className="ps-inbox-list"><div className="ps-section-head"><h2>Conversas</h2><Tag>{conversations.length}</Tag></div>{conversations.map(contact => <button className={conversation === contact.id ? 'is-active' : ''} key={contact.id} onClick={() => { setState(prev => ({ ...prev, drafts: { ...prev.drafts, [conversation]: draft }, notes: { ...prev.notes, [conversation]: note } })); setConversation(contact.id); }}><span className="ps-avatar">{contact.initials}</span><span><strong>{contact.name}<small>{contact.time}</small></strong><p>{contact.topic}</p></span></button>)}<p className="ps-inbox-disclaimer">Contatos fictícios. WhatsApp e e-mail ainda não conectados.</p></aside>
          <div className="ps-conversation"><div className="ps-conversation-head"><span className="ps-avatar">{currentConversation.initials}</span><div><h2>{currentConversation.name}</h2><small>{currentConversation.channel}</small></div><Tag>Exemplo</Tag></div>
            <div className="ps-conversation-summary"><Sparkles size={17} /><div><span className="ps-overline">CONTEXTO · RESUMO DE EXEMPLO</span><p>{currentConversation.summary}</p></div></div>
            <div className="ps-message"><p>{currentConversation.message}</p><small>{currentConversation.time} · mensagem fictícia</small></div>
            <div className="ps-composer"><label htmlFor="ps-draft">Rascunho de resposta</label><textarea id="ps-draft" rows={4} maxLength={2500} value={draft} onChange={e => setDraft(e.target.value)} placeholder="Prepare o próximo retorno…" /><div><button className="ps-text-button" onClick={() => { if (!draft.trim()) setDraft(currentConversation.reply); else setToast('Guarde ou limpe seu rascunho antes de usar o exemplo.'); }}><Sparkles size={15} />Usar sugestão de exemplo</button><button className="ps-button ps-button--primary" onClick={saveConversation}>Guardar rascunho <Check size={16} /></button></div><label htmlFor="ps-contact-note">Nota interna</label><textarea id="ps-contact-note" rows={2} maxLength={1500} value={note} onChange={e => setNote(e.target.value)} placeholder="Próxima ação, compromisso ou observação da equipe" /><small>Rascunhos e notas ficam neste navegador. Nenhuma mensagem será enviada.</small></div>
          </div></section>}

        {page === 'locacoes' && <><section className="ps-stats ps-stats--three">{[{ label: 'Aluguéis da competência', value: money(rentals.reduce((n,r) => n + r.rent, 0)), note: 'Setembro de 2026 · valores de exemplo' },{ label: 'Recebimentos registrados', value: money(rentals.reduce((n,r) => n + r.received, 0)), note: 'Valores de terceiros, não receita EME' },{ label: 'Saldo a receber', value: money(rentals.reduce((n,r) => n + r.rent - r.received, 0)), note: 'Inclui cobrança ainda não vencida' }].map(s => <div className="ps-stat" key={s.label}><div><span>{s.label}</span><KeyRound size={18} /></div><strong className="ps-money-stat">{s.value}</strong><small>{s.note}</small></div>)}</section><section className="ps-card"><div className="ps-section-head"><div><span className="ps-overline">Administração mensal</span><h2>Contratos em acompanhamento</h2></div><Tag>Setembro 2026</Tag></div><div className="ps-rental-list">{rentals.map(r => <button className="ps-rental-row" key={r.id} onClick={() => setRentalId(r.id)}><img src={r.image} alt="" /><div><strong>{r.name}</strong><small>{r.city} · {r.id}</small></div><div><strong>{money(r.rent)}</strong><small>Vence em {r.due}</small></div><Tag tone={r.state === 'Pagamento parcial' ? 'amber' : 'neutral'}>{r.state}</Tag><ArrowUpRight size={19} /></button>)}</div></section><div className="ps-two-columns"><section className="ps-card"><div className="ps-section-head"><h2>Próximos compromissos</h2><CalendarDays size={19} /></div>{rentals.map(r => <button key={r.id} className="ps-contract-event" onClick={() => setRentalId(r.id)}><span>{r.eventDate}</span><div><strong>{r.event}</strong><small>{r.name}</small></div><ChevronRight size={17} /></button>)}</section><section className="ps-card ps-rental-note"><ShieldCheck size={23} /><h2>Clareza em cada repasse.</h2><p>Recebimentos, taxas e valores do proprietário têm registros separados. Confira um contrato para explorar o demonstrativo.</p><small>Sem cobrança, conexão bancária ou transferência nesta prévia.</small></section></div></>}

        {page === 'qualidade' && <><div className="ps-chips" aria-label="Selecionar profissional de exemplo">{['Lia Martins','Rafael Costa'].map(name => <button key={name} aria-pressed={teamMember === name} className={teamMember === name ? 'is-active' : ''} onClick={() => setTeamMember(name)}>{name}</button>)}</div><div className="ps-two-columns ps-quality-grid"><section className="ps-card"><div className="ps-section-head"><div><span className="ps-overline">Profissional fictício</span><h2>{teamMember}</h2></div><span className="ps-avatar">{teamMember.split(' ').map(n => n[0]).join('')}</span></div><p className="ps-muted">Amostra demonstrativa de atendimento. Indicadores reais dependem de canais conectados e critérios acordados com a equipe.</p>{[{ label: 'Precisão das informações', result: 'Revisão de evidências', detail: 'Conferir as informações transmitidas com a versão aprovada do dossiê.' },{ label: 'Continuidade do atendimento', result: teamMember === 'Lia Martins' ? '1 retorno para revisar' : '1 compromisso para revisar', detail: 'Considerar expediente, distribuição dos contatos e disponibilidade do canal.' },{ label: 'Resultado comercial', result: 'Amostra insuficiente', detail: 'Conversão não será usada isoladamente para medir qualidade.' }].map(row => <div className="ps-quality-row" key={row.label}><strong>{row.label}</strong><Tag>{row.result}</Tag><p>{row.detail}</p></div>)}</section><section className="ps-card"><div className="ps-section-head"><div><span className="ps-overline">Desenvolvimento</span><h2>Uma oportunidade de cuidado</h2></div><Sparkles size={21} /></div><div className="ps-evidence-quote"><span className="ps-overline">TRECHO FICTÍCIO · 12/09</span><p>“Vou confirmar as opções de horário e retorno amanhã.”</p></div><h3>Verificar se o retorno foi registrado</h3><p className="ps-muted">A ausência de uma mensagem no sistema não comprova que o profissional deixou de responder. O gestor precisa conferir a cobertura do canal e o contexto.</p><button className="ps-button" onClick={() => go('relacionamento')}>Conferir o contexto <ArrowUpRight size={16} /></button><div className="ps-note"><ShieldCheck size={18} /><p>Revisão humana e possibilidade de contestação. Sem ranking, punição ou remuneração automática.</p></div></section></div></>}

        {page === 'inteligencia' && <><div className="ps-ai-status"><Sparkles size={24} /><div><h2>Capacidades desenhadas. Integrações em preparação.</h2><p>Os resumos desta prévia são exemplos escritos. Nenhum modelo de IA ou fonte externa está processando os dados.</p></div><Tag>Não conectada</Tag></div><div className="ps-capabilities">{capabilities.map((item,i) => <button key={item.name} className="ps-capability ps-card" onClick={() => setCapability(i)}><div><span className="ps-capability-number">0{i + 1}</span><ArrowUpRight size={19} /></div><h2>{item.name}</h2><p>{item.description}</p><span className="ps-text-button">Ver escopo e controles <ArrowRight size={15} /></span></button>)}</div><div className="ps-note"><ShieldCheck size={18} /><p>Cada capacidade será testada com evidências antes de receber autonomia. A equipe permanece responsável pelas decisões importantes.</p></div></>}

        {page === 'padrao' && <div className="ps-two-columns"><section className="ps-card"><div className="ps-section-head"><div><span className="ps-overline">Régua experimental · versão 0.1</span><h2>Qualidade que se pode explicar.</h2></div><Tag>Em calibração</Tag></div><p className="ps-muted">Quatro dimensões, com evidências próprias para cada categoria. Nenhuma faixa mínima de preço.</p>{dimensions.map((d,i) => <div className="ps-weight-row" key={d}><div><strong>{d}</strong><b>{weights[i]}<small> pontos</small></b></div><span><i style={{ width: weights[i] + '%' }} /></span></div>)}<p className="ps-muted">Conservação e funcionalidade precisam de critérios diferentes para residências, espaços comerciais, galpões e terrenos.</p></section><section className="ps-card"><div className="ps-threshold"><strong>80<span>/100</span></strong><p>Referência proposta para testar.<br />Ainda não é uma política aprovada.</p></div><h2>Uma boa nota é parte da decisão.</h2><ul className="ps-check-list"><li><Check size={16} />Mínimo de 3/5 em cada dimensão.</li><li><Check size={16} />Evidências obrigatórias completas.</li><li><Check size={16} />Verificações documentais da etapa concluídas.</li><li><Check size={16} />Decisão humana registrada.</li></ul><div className="ps-note"><ShieldCheck size={18} /><p>Uma informação não verificada permanece pendente. O resultado não significa “imóvel limpo” nem autoriza publicação automática.</p></div></section></div>}
        {!copy && <button className="ps-button ps-button--primary" onClick={() => go('hoje')}>Voltar à visão geral <ArrowRight size={17} /></button>}
      </main>
      <footer className="ps-footer"><span>EME Select <b> / </b> Um novo padrão de cuidado.</span><span>Portal · primeira versão</span></footer>
    </div>

    {newEvaluation && <NewEvaluation onClose={() => setNewEvaluation(false)} onCreate={item => { setState(prev => ({ ...prev, evaluations: [item, ...prev.evaluations] })); setNewEvaluation(false); openCase(item.id); setToast('Avaliação de exemplo criada. Alterações salvas neste navegador.'); }} />}
    {agenda && <Panel title="Agenda operacional" onClose={() => setAgenda(false)}><p className="ps-muted">Compromissos de exemplo · 13 de setembro de 2026. Marcar uma tarefa como concluída não libera a avaliação vinculada.</p><TaskList all /></Panel>}
    {currentCase && <Panel title={currentCase.title} onClose={() => setSelected(null)} wide>
      <div className="ps-dossier-cover"><img src={currentCase.image} alt="Cenário ilustrativo do dossiê" /><span>{currentCase.id} · {currentCase.city}</span></div>
      <div className="ps-dossier-meta"><StageTag stage={currentCase.stage} /><span>{currentCase.type} · {currentCase.operation}</span></div>
      <div className="ps-dossier-summary"><span className="ps-overline"><Sparkles size={14} /> HISTÓRICO INICIAL · EXEMPLO EDITORIAL</span><p>{currentCase.summary}</p><small>Responsável: {currentCase.assignee} · {currentCase.owner}</small></div>
      <div className="ps-dossier-score"><div><span className="ps-overline">CURADORIA EXPERIMENTAL</span><strong>{scoreOf(currentCase.scores) ?? '—'}<small>/100</small></strong><p>{scoreOf(currentCase.scores) === null ? 'Evidências incompletas' : 'Pontuação do exemplo'}</p></div><div>{dimensions.map((d,i) => <div key={d}><span>{d}</span><b>{currentCase.scores[i] ?? '—'}<small>/5</small></b></div>)}</div></div>
      <section className="ps-dossier-section"><div className="ps-section-head"><h3>Documentação e pendências</h3><Tag tone={currentCase.legal === 'Conferido' ? 'green' : 'amber'}>{currentCase.legal}</Tag></div><p className="ps-muted">Situação fictícia para experimentar o fluxo. Nenhum documento real foi consultado.</p>{currentCase.pending.length ? <ul className="ps-pending-list">{currentCase.pending.map((p,i) => <li key={i}><Clock3 size={15} />{p}</li>)}</ul> : <div className="ps-note"><ShieldCheck size={18} /><p>Requisitos da etapa concluídos no exemplo. A revisão final continua sendo da equipe.</p></div>}</section>
      <section className="ps-dossier-section"><h3>Decisão de entrada</h3>{currentCase.stage === 'Entrada aprovada' ? <div className="ps-note"><Check size={18} /><p>Entrada aprovada neste exemplo. Nenhum imóvel foi publicado no site.</p></div> : <><label className="ps-review-check"><input type="checkbox" checked={currentCase.reviewed} onChange={e => patchCase(currentCase.id, { reviewed: e.target.checked })} />Revisei as evidências demonstrativas deste dossiê.</label><button className="ps-button ps-button--primary" disabled={Boolean(approvalBlock(currentCase))} onClick={approve}>Aprovar entrada de exemplo <Check size={17} /></button>{approvalBlock(currentCase) && <p className="ps-block-reason">{approvalBlock(currentCase)}</p>}<label className="ps-form-label" htmlFor="ps-decision-note">Solicitar ajuste no exemplo</label><textarea id="ps-decision-note" rows={2} maxLength={600} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Descreva a informação ou ajuste necessário (mínimo 8 caracteres)" /><button className="ps-button" disabled={decisionNote.trim().length < 8} onClick={requestChanges}>Registrar ajuste <ArrowRight size={16} /></button></>}</section>
      <section className="ps-dossier-section"><h3>Histórico do caso</h3><ol className="ps-history">{currentCase.history.map((event,i) => <li key={i}>{event}</li>)}</ol></section>
    </Panel>}
    {currentRental && <Panel title={currentRental.name} onClose={() => setRentalId(null)}><Tag>{currentRental.state}</Tag><p className="ps-muted">{currentRental.id} · Setembro de 2026 · valores fictícios</p><div className="ps-ledger">{[{ label: 'Aluguel da competência', value: money(currentRental.rent) }, { label: 'Recebimento registrado', value: money(currentRental.received) }, { label: 'Saldo a receber, sem encargos', value: money(currentRental.rent - currentRental.received) }, { label: 'Taxa de administração do exemplo', value: currentRental.fee === null ? 'A calcular' : money(currentRental.fee) }, { label: 'Repasse previsto, ainda não pago', value: currentRental.fee === null ? 'Não calculado' : money(currentRental.received - currentRental.fee) }].map(row => <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}</div><div className="ps-note"><FileText size={18} /><p>{currentRental.note}</p></div><h3>Partes do contrato</h3><p className="ps-muted">{currentRental.owner}<br />{currentRental.tenant}</p><h3>Próximo compromisso</h3><p>{currentRental.eventDate} · {currentRental.event}</p><small className="ps-muted">Demonstrativo de navegação. Não constitui cobrança ou comprovante de pagamento.</small></Panel>}
    {capability !== null && <Panel title={capabilities[capability].name} onClose={() => setCapability(null)}><Tag>Integração em preparação</Tag><h3>Informações necessárias</h3><p>{capabilities[capability].inputs}</p><h3>Entrega prevista</h3><p>{capabilities[capability].outputs}</p><div className="ps-note"><ShieldCheck size={18} /><p>{capabilities[capability].limits}</p></div><h3>Antes de operar</h3><p>Conectar as fontes autorizadas, validar as instruções com casos de teste e definir responsáveis pela revisão.</p></Panel>}
    {toast && <div className="ps-toast" role="status"><Check size={17} /><span>{toast}</span><button className="ps-icon" aria-label="Fechar aviso" onClick={() => setToast('')}><X size={16} /></button></div>}
  </div>;
}
