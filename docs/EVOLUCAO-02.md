# EME Select · evolução 0.2

13 de setembro de 2026.

## Experiência entregue

- A busca da página inicial leva à coleção completa, com resultados editáveis e endereço compartilhável.
- Filtros de região, compra/locação, tipo, faixa de valor, área mínima e quartos. Faixas invertidas exibem orientação e preservam o que foi digitado. Ordenação por coleção, valor ou área.
- Coleções para casas, apartamentos, compactos e condomínios horizontais/verticais, com acesso pelo menu Explorar.
- Seleção de dois a três imóveis para comparação, disponível na coleção e nos favoritos. A quarta seleção não substitui outra silenciosamente.
- Comparação de valores, características, localização e critérios apresentados. A opção de diferenças oculta linhas iguais, sem declarar vencedores ou atribuir pontuação de qualidade.
- Links da comparação restauram a seleção e a busca de origem. Remover e adicionar imóveis, voltar à coleção e solicitar visita estão conectados aos fluxos existentes.
- Versões de computador e celular, com tabela rolável dentro de sua própria área, navegação por teclado e dados demonstrativos identificados.

## Verificação

- 9 testes unitários novos: normalização de URL, valores inválidos, faixa inclusiva, área/quartos, condomínios, ordenação e preservação dos dados.
- 7 testes novos no navegador: filtros e histórico, tipos, faixa invertida, limite de seleção, mistura de compra/locação, links inválidos/repetidos e largura móvel.
- 1 teste novo de fluxo: menu por teclado, diferenças, solicitação de visita vinculada ao imóvel, recarregamento e retorno aos filtros de origem.
- 5 testes de regressão: ambientes e visita, busca/favoritos, documentação e foco, menu móvel/rotas e apresentação com movimento reduzido.

Todos os 22 testes executados nesta evolução passaram. O repositório reúne 35 testes ao somar os testes anteriores de formulário e busca, cujo código-base foi preservado. Os testes foram executados em rodadas separadas, com um worker para evitar disputa entre processos de validação. As primeiras tentativas apontaram localizadores inadequados dos controles; estes foram corrigidos para usar seus nomes acessíveis.

Capturas revisadas: `docs/qa/v02-catalogo-1440.png`, `v02-catalogo-390.png`, `v02-comparacao-1440.png` e `v02-comparacao-390.png`. Sem erro de execução e sem rolagem horizontal da página nos tamanhos 1440 × 1000 e 390 × 844.

## Limites que continuam válidos

O catálogo permanece ilustrativo. A busca é local e determinística, sem modelo de IA; a comparação não confirma condições físicas, documentação ou disponibilidade. A implementação não introduz backend, painel de operação, análise de documentos, tours 3D reais ou coleta central de contatos. A apresentação HyperFrames existente foi preservada.
