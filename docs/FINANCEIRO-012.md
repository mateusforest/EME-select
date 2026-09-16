# Central financeira · 0.12.0

Rota: `/portalselect/financeiro`. Acesso exclusivo de administradores ativos da EME, após autenticação e eventual troca obrigatória de senha. Corretores não recebem os dados financeiros da empresa. Os vínculos de imóveis e corretores usam os cadastros existentes.

## Começar com dados reais

1. Em **Contas**, cadastrar cada conta bancária ou caixa físico, a data de partida, seu saldo conferido e a parcela pertencente a terceiros. Não há conexão com bancos nem movimentação de dinheiro.
2. Em **Sócios e regras**, informar participações, comissão padrão, reserva padrão por operação, meta de caixa e investimento inicial usado no payback. Percentuais permanecem indefinidos até serem informados; nenhuma divisão foi presumida.
3. Em **Recorrências**, cadastrar despesas fixas e receitas mensais próprias, como honorários de administração. A geração de cada competência é explícita e não duplica o mesmo mês. O lançamento nasce como previsão; conferir/reconhecer ou baixar conforme a operação real.
4. Em **Lançamentos**, cadastrar receitas e compromissos, com categoria, valor, competência, vencimento, custo fixo/variável, centro de custo e vínculos opcionais. Registrar a baixa somente após o recebimento ou pagamento efetivo.
5. Em **Operações e corretores**, registrar a remuneração devida à EME em cada venda, locação ou administração. A operação gera a receita, comissão do corretor e custos diretos; não usa o preço total do imóvel como receita da empresa.
6. Conferir **Visão geral** e **DRE e projeções**. Exportações CSV permitem conferência externa. Não há dados financeiros fictícios na inicialização.

## Caixa, resultado e dinheiro de terceiros

Valores são armazenados em centavos inteiros e percentuais em pontos-base (100 = 1%). O caixa considera saldos iniciais e baixas até a data atual. A DRE considera competência e reconhecimento, independentemente da quitação. Uma previsão em aberto afeta o planejamento, mas não o resultado realizado.

Transferências entre contas da EME não geram receita. Aportes, principal de empréstimos, investimentos, repasses e distribuições de lucros têm classificações próprias fora da DRE operacional. Juros e tarifas são despesas financeiras. Tributos devem ser informados e classificados; o portal não apura automaticamente obrigações tributárias.

Aluguéis recebidos para repasse ao proprietário são dinheiro de terceiros. O saldo próprio disponível é o saldo das contas menos a obrigação de terceiros, e não o total depositado no banco.

**Taxa cobrada separadamente:** usar `Taxa de administração cobrada separadamente`; sua baixa registra a entrada bancária correspondente.

**Taxa descontada do aluguel:** usar `Taxa de administração retida do aluguel`. Por exemplo, entrada de R$ 1.000 de aluguel, repasse de R$ 900 e retenção de R$ 100 deixam R$ 100 no banco, nenhuma obrigação com o proprietário e R$ 100 de receita EME. A retenção não cria outro depósito e exige saldo de terceiros disponível na data; com imóvel vinculado, exige também saldo desse imóvel. Vincular recebimento, repasse e retenção ao mesmo imóvel.

Pró-labore é despesa operacional. Distribuição de lucros é destinação do resultado, sem reduzir o lucro da DRE. Uma baixa apenas registra no sistema o que ocorreu fora dele; nunca transmite ordem ao banco.

## DRE, indicadores e projeções

| Indicador | Regra gerencial |
| --- | --- |
| Receita líquida | Receita própria bruta menos deduções |
| Lucro bruto | Receita líquida menos comissões e custos diretos |
| Resultado operacional | Lucro bruto menos despesas operacionais, incluindo pró-labore |
| Lucro líquido gerencial | Resultado operacional + receitas financeiras − despesas financeiras − tributos sobre o resultado informados |
| Resultado por corretor | Receita atribuída − comissão − custos diretos; não rateia despesas gerais automaticamente |
| MRR | Soma das receitas recorrentes próprias ativas no mês atual; exclui aluguel bruto de terceiros |
| ARR | MRR × 12, uma anualização; não representa receita anual já recebida nem contrato garantido |
| Projeção | Seis meses a partir do mês atual, por vencimentos abertos e recorrências; inclui atrasados no primeiro mês e evita duplicidade de competências geradas |
| Payback | Investimento inicial informado versus caixa operacional próprio acumulado. Prazo estimado usa a média de meses completos disponíveis; sem histórico positivo, não inventa prazo |

A seleção de competência controla a DRE e os resultados do período. Caixa, MRR e projeções referem-se ao momento atual, identificados na interface. A projeção não presume novas vendas.

A **DRE automática** vem dos lançamentos reconhecidos. **Ajustes manuais** têm grupo, competência, valor com sinal e justificativa, apresentados em coluna separada; a coluna **Combinado** soma ambas. Ajustes não mudam o banco nem substituem silenciosamente os lançamentos. Sem lançamentos automáticos, é possível preencher a DRE por ajustes manuais. Cancelamentos preservam o registro e exigem motivo.

## Reserva e sócios

A reserva de cada operação usa o percentual definido sobre a **receita bruta da EME**, gravado junto à operação. A sugestão acumulada considera operações recebidas; é uma referência gerencial, não uma despesa, nem saldo separado em banco. Alterar o padrão não recalcula operações antigas.

A simulação de distribuição exige participações ativas somando 100%. Sua base é limitada pelo resultado positivo disponível e pelo caixa próprio, protegendo a maior referência entre meta de caixa e reserva sugerida, além dos compromissos conhecidos até o maior entre o fim do período e 30 dias à frente. Inclui custos recorrentes ainda não gerados e desconta distribuições já reconhecidas. Não antecipa resultado futuro.

A simulação não aprova distribuição nem efetua pagamentos. A deliberação cabe aos sócios, com conferência contábil. Retiradas efetivas devem ser registradas na categoria correspondente, vinculadas ao sócio.

## Integridade e implantação

- `GET /api/finance`: estado, revisão, vínculos e histórico, sem cache.
- `POST /api/finance/commands`: comando validado, revisão esperada e UUID de solicitação. Reenvio da mesma solicitação não duplica o registro; edição concorrente exige atualização e conferência.
- Operação gera receita e custos atomicamente. Corrigir uma operação requer cancelar o conjunto com motivo e cadastrar a substituta; não é possível cancelar somente seu custo e preservar artificialmente a receita.
- Auditoria registra administrador, comando, horário, revisão e hashes anterior/posterior. Cancelamentos são lógicos, preservando rastreabilidade. Não há exclusão física pela interface.
- Persistência local em SQLite e produção em Supabase. As tabelas financeiras são privadas, com RLS, acesso somente pelo servidor e validação de sessão ativa de administrador também na gravação transacional.
- Migration: `supabase/migrations/20260916_finance.sql`. Cria três tabelas novas e uma função; inicializa somente um estado vazio. Aplicar **uma vez, antes do deploy**, mediante autorização de produção. Não modifica imóveis nem cadastros existentes.
- Rodar `npm run test:finance`, `npm run test:api`, `npm run test:cloud`, `npm run build` e `npx playwright test tests/finance-workspace.spec.ts` para validar.

Open Finance, conciliação por extrato, execução de pagamentos, boletos, cálculo fiscal e automação de cobranças não fazem parte desta versão. A DRE é gerencial e depende de classificação, integridade dos registros e revisão contábil.

### Validação da entrega

Em 16/09/2026, a migration autorizada foi aplicada no projeto Supabase da EME. Conferência somente de leitura confirmou revisão zero, listas vazias, percentuais indefinidos e resposta 401 a consultas públicas nas três tabelas financeiras. Nenhuma transação financeira real foi criada.

O build TypeScript/Vite passou. Foram aprovados 36 testes da suíte financeira, 40 da API e 17 de cloud (há cobertura sobreposta entre essas suítes). Os testes de interface cobrem cadastros, baixa, DRE, operações, recorrências, sócios, falha de rede, concorrência, bloqueio de corretor e competência inválida. Conferência adicional de navegador usou o build e a API reais com SQLite temporário, sem acessar dados financeiros de produção.

## Referências usadas nas definições

- [Sebrae: regime de caixa e competência na gestão financeira](https://meuatendimento.sebrae.com.br/sites/PortalSebrae/artigos/como-fazer-a-gestao-financeira-do-pequeno-negocio%2Cd999a442d2e5a410VgnVCM1000003b74010aRCRD).
- [CPC 03: demonstração dos fluxos de caixa](https://www.cpc.org.br/CPC/Documentos-Emitidos/Pronunciamentos/Pronunciamento?Id=34).
- [Stripe: MRR e ARR](https://support.stripe.com/questions/understanding-monthly-recurring-revenue-%28mrr%29-and-annual-recurring-revenue-%28arr%29?locale=pt-BR).

As referências orientam conceitos; as fórmulas acima documentam o comportamento efetivamente implementado no módulo, sem certificação de demonstrações contábeis.
