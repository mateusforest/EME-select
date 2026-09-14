# Verificação da primeira versão

Data: 13 de setembro de 2026. Navegador: Microsoft Edge, com Playwright. Ambiente: Windows local.

## Resultado

- TypeScript em modo estrito e build Vite concluídos.
- 9 testes da busca: ambiente, operação, tipo, acentos, plurais, palavras inteiras, exclusões e casos sem correspondência.
- 5 testes de navegação: quatro ambientes, cenário → visita → detalhes, filtros, favoritos persistentes, estado vazio, remoção de favoritos, modal documental, foco e Escape, menu móvel, rota inexistente e movimento reduzido.
- 4 testes de formulários: campos obrigatórios, telefone, consentimento, datas passadas, horário, revisão, edição, limpeza e formulário de proprietário. Destino WhatsApp e codificação da mensagem conferidos sem envio externo; ausência de dados pessoais em armazenamento local verificada.
- HyperFrames: lint, validação de composição e inspeção em nove instantes, sem erros ou avisos. Apresentação com 4,8 segundos, controles e preferência de movimento reduzido.
- Inspeção visual de início, Litoral, Serra, Urbano, visita, detalhes, agendamento e proprietários. Layout móvel verificado em 390 × 844; desktop em 1440 × 1000. Sem rolagem horizontal nas rotas verificadas.

Total: **18 testes automatizados passaram**, além das verificações de composição e da inspeção visual. As suítes foram executadas separadamente; os testes de navegador usaram um worker para evitar disputa com outras verificações locais. A configuração entregue limita a execução normal a dois workers.

## Arquivos

As capturas de revisão estão em `docs/qa/`. Os testes reproduzíveis estão em `tests/`. A composição e suas verificações próprias estão em `motion/`.

## Alcance

Estas verificações cobrem a interface local e o catálogo demonstrativo. Não houve envio de mensagem, consulta a documento real, avaliação por IA, validação de endereço de imóvel ou teste de uma operação imobiliária comercial. Não foram configurados domínio, hospedagem pública ou serviços de backend.
