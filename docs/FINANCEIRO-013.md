# Financeiro 013 — caixa, resultado e saldos dos sócios

Decisão e verificação: 15/10/2026. Complementa `FINANCEIRO-012.md`. Os valores são armazenados em centavos inteiros e os percentuais em pontos-base: 2.500 = 25%.

## O que cada saldo significa

| Movimento | Caixa | DRE | Saldo do sócio |
| --- | --- | --- | --- |
| Saldo bancário inicial | Abre o saldo da conta na data informada | Não gera receita ou lucro | Não identifica por si só a origem do dinheiro |
| Capital integralizado | Aumenta quando recebido | Não gera receita | Aumenta capital; não cria empréstimo reembolsável |
| Empréstimo do sócio | Aumenta quando recebido | Principal não gera receita | Aumenta principal devido ao sócio |
| Receita reconhecida, ainda em aberto | Não aumenta até o recebimento | Entra na competência reconhecida | Pode aumentar expectativa de lucro, sem liberar retirada automaticamente |
| Recebimento de receita já reconhecida | Aumenta na baixa | Não reconhece a mesma receita novamente | Pode liberar caixa para destinação, respeitadas as demais travas |
| Despesa reconhecida em aberto | Não reduz o banco antes da baixa | Reduz resultado na competência | Reduz o lucro disponível; também protege o compromisso no caixa |
| Distribuição de lucro | Reduz quando paga, pelo líquido após retenção informada | Não é despesa | Usa o direito bruto de lucro, inclusive quando programada e ainda não paga |
| Devolução do principal emprestado | Reduz quando paga | Não é despesa | Reduz dívida e investimento líquido do sócio |
| Recolhimento de imposto retido do sócio | Reduz quando pago | Não é despesa adicional da empresa | Quita a retenção vinculada ao lucro bruto já destinado |

O CPC 00 (R2), item 1.17, separa o efeito econômico na competência do momento de recebimento/pagamento. Seus itens 4.68–4.70 excluem aportes de proprietários da receita e distribuições de proprietários da despesa. O CPC 03 (R2), item 17, distingue fluxos de financiamento, incluindo capital e principal de empréstimos, de fluxos operacionais. Fontes oficiais: [CPC 00 (R2)](https://www.cpc.org.br/Arquivos/Documentos/573_CPC00%28R2%29.pdf) e [CPC 03 (R2)](https://www.cpc.org.br/Arquivos/Documentos/183_CPC_03_R2_rev%2024.pdf).

### Exemplo de conferência

Com R$ 50.000 de saldo inicial e R$ 100.000 de honorários já reconhecidos:

1. Antes do recebimento: banco R$ 50.000, receita/DRE R$ 100.000, recebimentos do período R$ 0. O saldo inicial não vira lucro e a política não libera a receita ainda não recebida.
2. Após receber: banco R$ 150.000, recebimentos do período R$ 100.000, receita/DRE continua R$ 100.000. O teto de lucro nunca passa a R$ 150.000 por causa do banco.
3. Se houve prejuízo anterior de R$ 60.000, o resultado acumulado restante limita uma nova destinação a R$ 40.000, antes das demais proteções.
4. Se R$ 60.000 daquele lucro já foram destinados, pagos ou em aberto, restam no máximo R$ 40.000. Trocar o filtro de mês não cria um novo direito sobre o mesmo lucro.

O exemplo presume ausência de outros custos, impostos da operação, compromissos ou reservas. Em uma venda intermediada, a receita da imobiliária é o honorário próprio, não o preço total do imóvel.

## Cadastro e histórico dos sócios

`openingDate`, `openingCapitalCents`, `openingLoanCents` e `openingRepaidCents` identificam valores históricos já conciliados. Não criam lançamento bancário nem receita. O saldo inicial da conta é informado separadamente e não deve ser repetido como novo recebimento.

As devoluções históricas não podem superar o principal histórico. Novos movimentos vinculados ao sócio devem ser posteriores à data de corte. O histórico fica preservado após programar devoluções; correções exigem resolver os registros dependentes. Uma alteração de cadastro não deve servir para apagar um empréstimo já pago.

Cada movimento posterior usa o sócio correto. Aportes e empréstimos sem vínculo aparecem como não atribuídos; precisam ser conciliados antes de interpretar a posição individual. A aplicação não transforma automaticamente uma transferência bancária em capital ou mútuo: a classificação deve corresponder ao documento que lhe dá origem.

Não existe neste cadastro um saldo inicial de lucros/prejuízos acumulados. Capital histórico, empréstimo histórico e saldo bancário não substituem esse saldo. A distribuição depende do histórico de resultados efetivamente registrado; uma implantação com períodos anteriores incompletos exige conciliação contábil e ajustes identificados, sem inserir capital como receita.

## Política de reembolso prioritário

A política `excess_first` compara o investimento líquido de cada sócio com sua participação. O investimento considerado é capital + principal emprestado − principal devolvido − devoluções já programadas. O menor investimento por ponto de participação define a base proporcional; o valor acima dela é excesso.

Exemplo: participações de 50% para cada sócio; A investiu R$ 80.000 e B R$ 20.000. O excesso de A é R$ 60.000. Se A tem R$ 20.000 de capital e R$ 60.000 de empréstimo ainda devido, o excesso pode ser reembolsado como principal. Se os R$ 80.000 são apenas capital, não há empréstimo a devolver automaticamente. Com participações 75%/25% e investimentos R$ 60.000/R$ 20.000, não existe excesso proporcional.

O plano limita o reembolso ao menor entre excesso proporcional, principal ainda devido não reservado e orçamento mensal. O padrão do orçamento é 25%, ajustável em `partnerRepaymentBps`. Meta de caixa precisa estar definida; zero é uma escolha explícita válida.

O teto é mensal, e não por clique. A base recompõe os reembolsos daquele mês já programados ou pagos antes de aplicar o percentual, e depois desconta o que já foi alocado. Com caixa livre de R$ 100.000, o teto de 25% permite R$ 25.000 no mês: programar R$ 10.000 e depois R$ 15.000 esgota o mesmo teto. Efetuar o pagamento ou trocar o filtro histórico não cria outro orçamento.

Enquanto existe excesso reembolsável ainda não programado, a distribuição disponível é zero. Quando todo esse excesso está programado, os pagamentos em aberto continuam protegidos como compromissos de caixa, e o eventual lucro pode ser destinado. Isso é uma política operacional da EME SELECT, não uma alíquota tributária nem uma exigência universal para sociedades.

“Compensação de aportes”, quando usada na interface, significa aqui prioridade de reembolso. A compensação jurídica de dívidas requer reciprocidade e outros requisitos: empréstimo a devolver e lucro a pagar são ambos obrigações da empresa para o sócio. Capital social não deve ser devolvido por essa rotina como se fosse empréstimo. O [Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm), arts. 368–369, 586 e 1.081–1.084, disciplina compensação, mútuo e alteração/redução de capital.

## Lucro esperado, reservado e disponível

A DRE segue o período selecionado. A disponibilidade de retirada usa conjuntamente:

- Resultado reconhecido da competência, descontadas suas distribuições já destinadas.
- Resultado acumulado até a data de referência, incluindo prejuízos e ajustes identificados, menos distribuições já destinadas no histórico.
- Caixa operacional realizado, descontados custos reconhecidos ainda em aberto e valores brutos já destinados como lucros.
- Caixa próprio livre após valores de terceiros, proteção de caixa e compromissos.
- Ausência de excesso reembolsável ainda não programado.

A proteção de caixa usa o maior entre a meta definida e a reserva sugerida. Os compromissos incluem contas em aberto no horizonte protegido, custos recorrentes ainda não gerados e reservas para sócios. Os valores destinados a sócios permanecem protegidos mesmo com vencimento posterior ao horizonte usual.

`periodShares` mostra a expectativa proporcional ainda não destinada da competência; não significa transferência disponível. `declaredCents`, `paidCents` e `pendingCents` usam a competência selecionada. Os valores de lucro pago/pendente nas linhas de cada sócio são acumulados. Valores de lucro são brutos antes de eventual retenção do beneficiário.

`distribution.plan` e `repayment.plan` são comandos de servidor: recalculam limites e geram lançamentos reconhecidos, em aberto, vinculados ao sócio e ao plano. O plano exige mês completo atual ou passado e justificativa. Não há saída de banco nesse momento. Um plano não pode destinar mais do que o limite disponível no momento da gravação.

A baixa revalida caixa, principal e lucro disponível. Prioridade de reembolso é conferida novamente mesmo se o lucro já pertence a plano. Cancelar o reembolso que sustentava uma distribuição pode bloquear sua baixa. Replanejar uma parcela cancelada deve recompor o direito do sócio faltante na competência, sem redistribuir sua parcela para quem já recebeu ou tem parcela reservada.

Não se elimina prejuízo ou distribuição anterior mudando o filtro. Uma correção que reduza o lucro após distribuições pode exigir acerto contábil e societário; o sistema sinaliza a inconsistência e bloqueia novas retiradas sem cobertura. Os arts. 1.009 e 1.059 do [Código Civil](https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm) tratam de lucros ilícitos/fictícios e retiradas com prejuízo do capital.

## Retenções e impostos

Impostos/deduções da operação são valor informado em `taxCents`; não há presunção de regime tributário ou alíquota. A comissão do corretor aplica seu percentual sobre honorários menos esse valor informado. Custos diretos e reservas continuam identificados separadamente.

Na baixa de distribuição, `withholdingCents` e `withholdingDueDate` permitem registrar retenção informada pelo responsável contábil. A destinação bruta é preservada. Sai do banco apenas o líquido; o imposto retido gera obrigação `partner_withholding`, vinculada por `sourceEntryId`, fora da DRE. Pagar essa obrigação depois completa a saída bruta sem duplicar distribuição nem despesa.

Exemplo: lucro bruto destinado R$ 100.000 e retenção manual R$ 10.000. A primeira baixa retira R$ 90.000; os R$ 10.000 ficam comprometidos até recolhimento. O direito bruto consumido é R$ 100.000. O exemplo verifica a mecânica e não determina qual tributo se aplica a uma operação concreta.

Cancelar a distribuição cancela sua retenção ainda em aberto. Se o recolhimento vinculado já foi baixado, o cancelamento da distribuição é bloqueado para evitar obrigação órfã. Correções devem preservar o histórico dos valores efetivamente pagos e recolhidos.

Desde janeiro de 2026, a Lei 15.270/2025 incluiu regra de IRRF sobre lucros/dividendos pagos ou creditados por uma mesma pessoa jurídica à mesma pessoa física residente no Brasil quando o montante mensal supera R$ 50.000, com incidência de 10% sobre o total nas hipóteses legais. Existem regras transitórias e situações específicas. O portal não apura automaticamente beneficiário, residência fiscal, exceções, total tributável mensal ou obrigações acessórias. Fontes: [Lei 15.270/2025](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/lei/l15270.htm) e [orientação da Receita Federal de 06/08/2026](https://www.gov.br/receitafederal/pt-br/assuntos/noticias/2026/agosto/receita-federal-orienta-sobre-os-procedimentos-para-o-recolhimento-do-imposto-de-renda-retido-na-fonte-sobre-lucros-e-dividendos/).

A lei também alcança creditamento, emprego e entrega. O preenchimento de retenção apenas na baixa não resolve, por si só, eventual fato gerador anterior. Planejamento interno, deliberação e efetivo crédito ao beneficiário precisam ser distinguidos e conferidos com a contabilidade. O portal não declara que todo lucro é isento nem que sua sugestão substitui apuração tributária, balanço ou deliberação societária.

## Verificação e limites de uso

`npm run test:finance` inclui testes de domínio, sócios, travas, API, persistência e roteamento. Em 15/10/2026, a lista completa do script foi executada diretamente com `node --test`: 82 testes aprovados, sem falhas. `tests/finance-partners.test.mjs` contém 33 cenários, incluindo os números acima, perda anterior, distribuição histórica, capital versus empréstimo, equalização proporcional, teto mensal repetido, proteção de caixa, cancelamento/reprogramação, retenções manuais e reconhecimento conjunto de receita/custos de operação prevista. As rotinas de gravação precisam preservar atomicidade: uma tentativa recusada não pode deixar parcelas parciais.

Saldo próprio inclui somente valores disponíveis à empresa; dinheiro de proprietários/terceiros fica separado. Juros e encargos não são amortização do principal e exigem categoria própria. Os saldos são gerenciais e dependem da integridade do histórico: conferência bancária, contratos de mútuo, atos societários, tributos e documentação continuam necessários para a decisão concreta.
