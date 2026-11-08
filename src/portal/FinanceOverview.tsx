import {ArrowDownLeft,ArrowUpRight,ArrowRight,CalendarDays,Plus,Repeat2,Wallet} from 'lucide-react';
import {FINANCE_CATEGORIES,type FinanceState,type FinanceReport} from '../../shared/finance.mjs';
import {financeDashboard} from '../../shared/finance-dashboard.mjs';

const money=(value:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
const date=(value:string)=>value.split('-').reverse().join('/');
type Props={state:FinanceState;report:FinanceReport;month:string;today:string;
 onEntry:(direction:'in'|'out')=>void;onRecurrence:()=>void;onAccount:()=>void;
 onEntries:(filter:'all'|'receivable'|'payable')=>void;onAccounts:()=>void;onRecurrences:()=>void;onSettle:(id:string)=>void};

export default function FinanceOverview({state,report,month,today,onEntry,onRecurrence,onAccount,onEntries,onAccounts,onRecurrences,onSettle}:Props){
 const dashboard=financeDashboard(state,month,today);
 return <div className="pf-simple-overview">
  <section className="pf-cash-summary" aria-label="Resumo do caixa">
   <div><span className="ps-overline">CAIXA DA EMPRESA · HOJE</span><h2>{money(report.cash.availableCents)}</h2><p>Saldo próprio, já separado dos valores de proprietários.</p><button className="ps-text-button" onClick={onAccounts}>Ver contas e saldos <ArrowRight size={16}/></button></div>
   <div className="pf-cash-actions"><button className="ps-button ps-button--primary" onClick={()=>onEntry('in')}><ArrowDownLeft size={17}/>Registrar entrada</button><button className="ps-button" onClick={()=>onEntry('out')}><ArrowUpRight size={17}/>Registrar despesa</button><button className="ps-button" onClick={onRecurrence}><Repeat2 size={17}/>Nova despesa recorrente</button></div>
   <details className="pf-cash-breakdown"><summary>Como este saldo é composto</summary><dl><div><dt>Total das contas</dt><dd>{money(report.cash.balanceCents)}</dd></div><div><dt>Valores de terceiros a repassar</dt><dd>{money(report.cash.thirdPartyHeldCents)}</dd></div></dl><p>Inclui saldos iniciais, aportes e movimentações confirmadas até hoje. Saldo de caixa não é lucro nem autorização para distribuir valores.</p></details>
  </section>
  <div className="pf-month-cards">
   <article><span>Entradas no mês</span><strong>{money(report.period.receivedCents)}</strong><small>Recebimentos confirmados</small></article>
   <article><span>Saídas no mês</span><strong>{money(report.period.paidCents)}</strong><small>Pagamentos confirmados</small></article>
   <button onClick={()=>onEntries('receivable')}><span>A receber no mês</span><strong>{money(dashboard.receivableCents)}</strong><small>Em aberto · por vencimento <ArrowRight size={14}/></small></button>
   <button onClick={()=>onEntries('payable')}><span>A pagar no mês</span><strong>{money(dashboard.payableCents)}</strong><small>Em aberto · por vencimento <ArrowRight size={14}/></small></button>
  </div>
  {!state.accounts.length&&<section className="pf-panel pf-start"><Wallet size={25}/><div><h3>Comece pelo saldo real da empresa.</h3><p>Cadastre a conta bancária ou o caixa físico com o saldo conferido.</p></div><button className="ps-button" onClick={onAccount}><Plus size={16}/>Adicionar primeira conta</button></section>}
  <div className="pf-simple-columns">
   <section className="pf-panel"><div className="pf-heading"><div><span className="ps-overline">O QUE PRECISA DE ATENÇÃO</span><h3><CalendarDays size={19}/>Próximos vencimentos</h3></div><button className="ps-text-button" onClick={()=>onEntries('all')}>Ver todos <ArrowRight size={15}/></button></div>
    {dashboard.overdueCents>0&&<p className="pf-overdue" role="status">{money(dashboard.overdueCents)} em pagamentos atrasados até hoje.</p>}
    {dashboard.upcoming.length?<ul className="pf-due-list">{dashboard.upcoming.map(entry=>{const incoming=FINANCE_CATEGORIES.find(c=>c.id===entry.category)?.direction==='in';return <li key={entry.id}><span className={'pf-due-icon '+(incoming?'is-in':'')}>{incoming?<ArrowDownLeft size={17}/>:<ArrowUpRight size={17}/>}</span><div><strong>{entry.description}</strong><small className={entry.dueDate<today?'pf-negative':undefined}>{entry.dueDate<today?'Em atraso · ':''}{date(entry.dueDate)} · {incoming?'A receber':'A pagar'}</small></div><div className="pf-due-action"><strong>{money(entry.amountCents)}</strong><button className="ps-text-button" onClick={()=>onSettle(entry.id)}>{entry.category==='management_fee_retained'?'Registrar retenção':incoming?'Receber':'Pagar'}</button></div></li>;})}</ul>:<p className="pf-empty-copy">Nenhum compromisso em aberto até o fim deste mês.</p>}
   </section>
   <section className="pf-panel pf-routine-summary"><span className="ps-overline">ROTINA DA EMPRESA</span><h3><Repeat2 size={19}/>Despesas fixas e recorrentes</h3><strong className="pf-routine-total">{money(dashboard.recurringExpenseCents)}<small>/ mês</small></strong><p>{dashboard.recurringExpenseCount?`${dashboard.recurringExpenseCount} ${dashboard.recurringExpenseCount===1?'regra de despesa ativa':'regras de despesa ativas'} no mês selecionado.`:'Cadastre aluguel, internet, sistemas e outros compromissos mensais.'}</p><dl><div><dt>Parcela de valor fixo</dt><dd>{money(dashboard.fixedExpenseCents)}</dd></div><div><dt>Parcela variável prevista</dt><dd>{money(dashboard.recurringExpenseCents-dashboard.fixedExpenseCents)}</dd></div></dl><button className="ps-button" onClick={onRecurrences}>Organizar recorrências <ArrowRight size={16}/></button><small>Previsão mensal das regras. Não soma novamente os lançamentos nem altera o caixa.</small></section>
  </div>
  {report.warnings.length>0&&<details className="pf-warning-list"><summary>{report.warnings.length} pontos para conferir no financeiro</summary><ul>{report.warnings.map((warning,index)=><li key={index}>{warning}</li>)}</ul></details>}
 </div>;
}
