# Financeiro 014 — aportes visíveis e projeção por sócio

16/10/2026. Complementa FINANCEIRO-013.md; mantém o armazenamento e as permissões existentes.

## Correções

Os botões de aporte abriam um formulário genérico que salvava a receber por padrão. O quadro dos sócios mostrava apenas entradas recebidas, sem listar os aportes pendentes. Agora há formulário específico com escolha obrigatória entre recebido e a receber. Recebido grava lançamento e baixa em uma transação; pendente aparece no quadro individual e no histórico com ação Receber aporte. Sem conta, o cadastro retorna ao formulário de aporte. Erros preservam campos.

O histórico de aportes mostra todas as datas, conta e situação, independentemente da competência selecionada. Inclui registros anteriores e cancelados, sem migrar ou duplicar dados. Lançamentos também oferece filtro Todas as datas. Capital histórico já incluído no saldo inicial continua separado de dinheiro novo. A data do histórico encerra o período histórico; uma nova baixa deve ser posterior para evitar duplicação.

A reserva padrão passa a abranger receitas avulsas recebidas, usando a configuração vigente; operações mantêm seu percentual original, inclusive zero explícito. Reserva é proteção gerencial, não despesa. Proteção = máximo(meta de caixa, reserva acumulada), e compromissos ficam protegidos adicionalmente.

## Projeção automática

`financeOutlook` clona os dados sem persistir alterações. Calcula seis posições de fim de mês, com receitas, rendimentos, custos, tributos, despesas, aportes, caixa próprio, proteção, compromissos, compensação de empréstimos e lucro disponível por sócio. Usa somente lançamentos e recorrências existentes; não inventa vendas nem alíquotas.

Premissas: previsões se realizam pela competência e pelo vencimento; vencidos entram no primeiro mês. Recorrências não geradas são incluídas sem duplicar competências existentes ou canceladas. Aportes e saldo inicial nunca viram lucro, terceiros não viram caixa próprio, prejuízos acumulados reduzem lucro disponível. Projeções preservam o limite mensal da compensação e a prioridade do excesso reembolsável. Lucro retirável exige quotas válidas e meta explícita. Direitos já destinados são deduzidos.

Os seis meses são cenários alternativos, sem presumir novas retiradas anteriores. Não somar as disponibilidades mensais. Compensações e distribuições aqui são sugestões, não contas a pagar nem pagamentos. Programações já existentes entram nos cálculos. Valores de lucros por sócio são brutos; não há retenção pessoal presumida. A tela alerta para custos recorrentes ausentes, reserva indefinida e tributos/comissões de receitas avulsas a conferir.

## Verificação

90 testes de domínio, API, persistência, autorização e regras financeiras (89 no conjunto mais uma conciliação de receita financeira); 18 cenários de navegador. O cenário de recarga dos aportes foi repetido após falha de rede local ERR_NETWORK_CHANGED no carregamento de módulo, passando sem alteração do teste. TypeScript e build de produção aprovados. Capturas desktop/mobile conferidas. Dados utilizados são sintéticos, sem alterações no financeiro real.
