# Comissão e caixa

Em `/portalselect/financeiro`, a aba **Comissão e caixa** oferece planejamento de seis meses para compra e venda urbana e rural. Acesso restrito a administradores. A simulação não cria lançamentos, não altera as regras das operações reais e não movimenta dinheiro. Alterações ficam em memória enquanto a área permanece aberta; a conferência pode ser exportada em CSV.

Premissas iniciais ajustáveis: aporte zero, fixos de R$ 6.000/mês, reserva de três meses, tributos hipotéticos de 12%, equipe com 50% da base líquida após parceiro externo e parceria externa inicialmente zero. Os fixos precisam ser conferidos quanto a retirada, contabilidade, jurídico e sistemas. A tributação não é apurada pelo simulador.

Comissão bruta menos tributos e custo adicional de emissão expressamente combinado resulta no líquido. A parceria externa sai primeiro; o percentual interno incide sobre o saldo positivo. Se o líquido for negativo, não se cria comissão negativa. Custos diretos e fixos são suportados pela empresa após a divisão. Não duplicar tributos como custo da nota.

O cenário-base usa dez vendas urbanas em seis meses, distribuídas em 1, 1, 2, 2, 2, 2, com um mês para recebimento, e uma rural no mês quatro, recebida em duas parcelas nos meses quatro e seis. Preços ilustrativos: R$ 500 mil urbano, corretagem de 6%, custo direto R$ 1.500; R$ 3 milhões rural, corretagem de 8%, custo direto R$ 10 mil. Todos esses valores são editáveis. Custos saem antes das entradas para evidenciar necessidade de capital dentro do mês. Tributos e repasses são segregados no recebimento como hipótese; vencimentos fiscais reais dependem de validação contábil.

Com essas premissas, contribuição por operação: R$ 11.700 urbana e R$ 95.600 rural. Menor caixa: −R$ 16.600; capital inicial total para manter R$ 18 mil de reserva: R$ 34.600; caixa final: R$ 150.200. No estresse, acrescentam-se dois meses ao recebimento urbano e a rural não ocorre, preservando o custo direto previsto: mínimo −R$ 43.000, capital R$ 61.000 e caixa final −R$ 8.200. São hipóteses, não previsão garantida.

Valores são calculados em centavos. A parcela rural final absorve o resíduo de arredondamento. A tabela mensal mostra entradas líquidas próprias, custos e saldo antes/depois das entradas; o detalhamento separa bruto, tributos, emissão e repasses. Recebimentos posteriores ao mês seis ficam fora do saldo do semestre.

Validação desta entrega: sete testes do cálculo, três testes de interface e oito testes de regressão financeira aprovados; TypeScript e build Vite aprovados; conferência visual em desktop e celular. Cobertura inclui isolamento dos lançamentos, permissão administrativa, campos inválidos, decimais, parcelamento, cenário-base e estresse.
