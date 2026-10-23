# Coleção, imagens e nova conversa

## Comportamento

- `/#/colecao` é uma página dedicada ao catálogo público, sem retornar à hero. Acesso pelo menu A coleção → Todos os imóveis, pela seção da home, pelos ambientes e pelos salvos.
- Filtros combinam texto, finalidade, estado, região, tipo, valor mínimo/máximo, área mínima, quartos, vagas e salvos. Ordenação por seleção, valor e área. O endereço preserva a consulta para compartilhamento, recarga e navegação. O botão de voltar do imóvel recupera os filtros e a posição na coleção.
- Resultados vêm exclusivamente do catálogo publicado. Ausência de imóveis não relaxa os critérios nem apresenta ofertas fictícias.
- Nova conversa limpa mensagens, critérios do assistente, campo da busca, transcrição e rascunho de contato; mantém página e favoritos. Interrompe o microfone e fica indisponível durante envio de contato em andamento.
- Hero mantém o panorama no movimento e carrega uma imagem própria de cada ambiente no detalhe, sem ampliar um pequeno recorte do panorama. São imagens conceituais, não fotografias de imóveis à venda.
- Vacaria usa o recorte original da catedral em maior definição, sem duplicação desfocada ao fundo. Palmas usa versões responsivas de 1200/2400 px da fotografia original. Composição limitada a 1440 px e adaptada ao celular.

## Validação

- Build Vite e verificação TypeScript.
- Testes do mapeamento do catálogo, filtros combinados, ordenação, favoritos, parâmetros inválidos e URLs compartilháveis.
- Testes existentes de leads, incluindo validação, recebimento HTTP e isolamento por corretor. A execução simultânea teve uma falha sem diagnóstico no processo de PGlite; a execução isolada do arquivo passou os três testes.
- Revisão no navegador em 1900 px e 390 px: filtros e estados vazios, anúncio e retorno, recarga, menus, chat e banners.
- A prévia local bloqueia envios; nenhum contato de teste foi criado em produção.

Os caminhos e prompts dos quatro detalhes conceituais estão em `IMAGENS-HERO-20261022.json`. Fotos reais de imóveis, condições comerciais e backend não foram alterados.
