# EME Select

Versão 0.12.0 da EME Select, com React, TypeScript, Vite, cenários fotográficos navegáveis e portal conectado ao Supabase na Vercel. A Central financeira em `/portalselect/financeiro` é exclusiva dos administradores: contas manuais, lançamentos, recorrências, comissões, sócios, caixa, projeções, payback e DRE gerencial. A migration financeira foi aplicada no Supabase em 16/09/2026, após autorização, com estado inicial vazio e acesso público negado. [Funcionamento, implantação e limites](docs/FINANCEIRO-012.md).

A ficha pública está em `/enviar-imovel`, com link para compartilhar pelo portal e protocolo de recebimento. As avaliações usam cinco dimensões de qualidade e conferências humanas separadas. Fotos abaixo da resolução mínima ficam no rascunho; a galeria em tela cheia preserva seu enquadramento sem ampliar arquivos pequenos. [Entrega da curadoria e fotos](docs/PORTAL-110.md).

O site preserva oito cenários — início, Litoral, Serra, Urbano, Condomínios, Comercial, Terrenos e Industrial — e um acervo demonstrativo de 18 imóveis identificado como ilustrativo. A home apresenta Casas, Casas em condomínio, Apartamentos e Compactos. O catálogo recebe anúncios reais somente após cadastro, curadoria humana e publicação explícita no portal. A etapa 3D foi adiada pelo usuário; os modelos de estudo permanecem fora da experiência ativa. Análise jurídica automática e avaliação por IA ainda não estão implementadas.

A atualização 0.4 integra tipos comerciais, terrenos urbanos, lotes em condomínio, terras agrícolas, galpões, pavilhões e centros de distribuição. Filtros, fichas, favoritos, comparação e formulário do proprietário acompanham essas categorias. [Registro da integração](docs/AMBIENTES-04.md) · [Imagens e prompts](docs/ASSETS-04.md).

## Abrir a versão pronta

Nova home e coleção Condomínios: [registro da atualização 0.4.1, imagens e prompts](docs/HOME-CONDOMINIOS-041.md).

Com o Node.js instalado, abrir `INICIAR-SITE.cmd` e acessar **http://127.0.0.1:4191**. Essa prévia usa a pasta `dist/` já entregue e funciona sem instalar dependências. Também pode ser iniciada com `npm start`. O servidor fica restrito ao computador local; ele não publica o site na internet.

## Desenvolver

Requisitos: Node.js 22.16 ou superior e npm. Na pasta do projeto:

```sh
npm ci
npm run dev
```

Abrir `http://127.0.0.1:4190`. Se essa porta estiver ocupada por outro projeto, ajustar a configuração de desenvolvimento. Depois de editar, executar `npm run build` para atualizar a versão da prévia pronta.

## Gerar e conferir

```sh
npm run build
npm run preview
npm test
```

- `build` verifica o TypeScript e gera a versão estática em `dist/`.
- `preview` serve o conteúdo gerado em `http://127.0.0.1:4190`.
- `test` executa testes de busca e interação com Playwright. A configuração atual usa o Microsoft Edge instalado. Para usar outro navegador, ajustar o canal em `playwright.config.ts`.

Não publicar o acervo demonstrativo como oferta de imóveis reais. [Escopo, limitações e próxima etapa](docs/PRODUCAO.md).

Verificação inicial: 18 testes de busca, navegação, acessibilidade e formulários passaram. A evolução 0.2 acrescentou 17 testes, todos aprovados, e repetiu cinco verificações de regressão com sucesso, reunindo então 35 testes. Telas conferidas em 1440 × 1000 e 390 × 844. Veja [o registro inicial](docs/VALIDACAO.md) e [a evolução 0.2](docs/EVOLUCAO-02.md).

A evolução 0.3 acrescenta oito testes espaciais, totalizando 43 casos aprovados na verificação de 13/09/2026. Veja [o registro de movimento e exploração](docs/MOVIMENTO-03.md).

A atualização 0.3.1 foi validada com **10 verificações aprovadas**: quatro testes novos da home fotográfica, cinco de navegação e um que percorre os três ambientes secundários. Foram conferidos a imagem original inteira e sem deformação, a ausência de canvas/maquete na home, os três pontos com suas âncoras, os limites de zoom/arraste, a restauração, o teclado e o toque em tela móvel com movimento reduzido. Os quatro testes fotográficos passaram juntos em 29,3 segundos; a regressão dos ambientes secundários passou em 8,5 segundos. Trata-se da seleção de testes pertinente a esta atualização, e não de uma nova execução integral de todos os casos históricos.

Na atualização 0.3.2, **48 casos foram validados**: a suíte de 47 casos passou após alinhar três testes de transição ao comportamento final; a correção visual da rolagem móvel recebeu um novo caso, aprovado junto dos quatro testes de transição existentes. As imagens originais foram conferidas por SHA-256. [Registro da restauração e transições](docs/CENARIOS-032.md).

## Exploração das imagens e transições

Na atualização 0.3.3, os cenários preenchem toda a área principal, sem as margens retangulares que o encaixe anterior deixava. O enquadramento recorta o excedente de forma proporcional; no celular, começa pela edificação principal e permite arrastar para conhecer o restante da paisagem. Treze testes de cenários, gestos, transições e interior passaram. [Registro do enquadramento](docs/ENQUADRAMENTO-033.md).

As imagens são apresentadas sem deformação. Na versão 0.4.1, a home usa uma variação da imagem original, com um edifício de compactos no lugar da cabana. O arquivo original permanece preservado. Arraste, aproximação e pontos clicáveis exploram cada paisagem; essa etapa não oferece movimento espacial entre pontos de vista. O piloto Marble foi adiado pelo usuário e nenhum mundo foi gerado. [Registro do piloto adiado](docs/MARBLE-PILOTO.md) · [Imagem e direção preparadas](marble-pilot/home/DIRECAO.md).

Selecionar um ponto aproxima o trecho correspondente da fotografia e abre os detalhes do imóvel. No interior, Sala, Varanda e Cozinha são enquadramentos da mesma imagem aprovada. Os controles permitem aproximar, afastar, centralizar e abrir em tela cheia. O movimento é interrompível e continua da posição atual ao receber outra escolha.

Mouse, toque, pinça e teclado são suportados. As setas deslocam a imagem; `+`/`-` ajustam a aproximação e `Home` restaura o enquadramento. A área de exploração captura os gestos, preservando a navegação e a rolagem no restante da página. Ampliação e arraste respeitam as bordas da imagem.

A troca de rota prepara e decodifica a próxima imagem antes de substituir a página. O cenário anterior se dissolve progressivamente sobre o novo, sem apagar toda a tela. Escolhas rápidas priorizam o último destino. A cópia visual de saída é inerte, oculta da acessibilidade e removida ao fim da transição. Falhas de imagem não bloqueiam a navegação. A preferência por movimento reduzido elimina as transições prolongadas. O navegador não carrega o visualizador 3D nessas telas.

## Coleção e comparação

A busca inicial abre `#/colecao`. A página permite refinar ambiente, finalidade, tipo, valor mínimo/máximo e área mínima, além de ordenar os resultados. Quartos aparecem apenas quando fazem sentido para o ambiente e o tipo. Áreas agrícolas são apresentadas em hectares e m²; o filtro usa m². O endereço guarda os filtros, inclusive após recarregar ou voltar. O preço é filtrado dentro da finalidade escolhida; em locação, representa apenas o aluguel mensal. Ao trocar a finalidade, os campos de valor são limpos para não aplicar um orçamento de compra ao aluguel.

Condomínios horizontais e verticais têm filtros próprios. O menu Explorar reúne ambientes e tipos. A seleção de comparação aceita até três imóveis, inclusive de finalidades diferentes, mantendo as unidades de cada preço explícitas. `#/comparar?ids=...` restaura a seleção; o parâmetro `retorno` guarda a busca de origem. A opção de diferenças oculta somente critérios iguais. Os favoritos continuam guardados no navegador; as comparações são mantidas durante a navegação e podem ser restauradas pelo link.

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| `src/` | Navegação, componentes, formulários, dados e estilos da aplicação |
| `src/data.ts` | Acervo ilustrativo, ambientes, filtros e contato comercial |
| `src/catalog.ts` | Validação, filtros avançados, ordenação e endereços da coleção |
| `src/CatalogPage.tsx` | Página de coleção e seleção para comparação |
| `src/Comparison.tsx` | Comparação de até três imóveis e visualização de diferenças |
| `src/PropertyDetails.tsx` | Detalhes, características e apresentação da curadoria |
| `src/Forms.tsx` | Solicitação de visita e envio de imóvel para avaliação |
| `src/spatial/` | Modelos 3D, materiais, câmera, arraste, imagem alternativa e telas dos ambientes |
| `public/assets/` | Logo aprovado e imagens dos ambientes |
| `public/motion/` | Arquivos da apresentação usados no site |
| `motion/` | Fonte editável da composição HyperFrames, identidade e verificações |
| `tests/` | Testes de navegação e interação |
| `docs/` | Escopo de produção e registro das imagens geradas |
| `dist/` | Saída de publicação, criada por `npm run build` |

## Contato e dados

O contato configurado em `src/data.ts` é **(54) 99157-8029**, no formato internacional **5554991578029**. A solicitação de visita monta uma mensagem para o visitante enviar no WhatsApp, sujeita à confirmação humana. O formulário de envio de imóvel grava uma solicitação privada no portal e apresenta um protocolo; não publica o imóvel.

Credenciais secretas ficam somente no ambiente do servidor (`.env.local` ignorado pelo Git e variáveis privadas da Vercel). Nunca colocar service-role, senhas ou segredos em `src/`, `public/` ou variáveis `VITE_*`. O banco local de desenvolvimento é separado do Supabase de produção.

A busca usa palavras-chave do catálogo e desconsidera acentos. Exemplos: `casa jardim`, `condomínio horizontal` e `casa sem piscina`. `sem`, `não` e `exceto` excluem o termo seguinte; `e`/`nem` continuam a exclusão e `com` retoma os termos desejados. Isso filtra o texto cadastrado, sem certificar características não informadas. Pedidos de número de quartos ou área ainda não são interpretados, e seus números não são descartados silenciosamente.

## Animação da marca

A apresentação tem 4,8 segundos, usa o logo aprovado e abre no quadro final. Os controles permitem iniciar, pausar e recomeçar; a preferência de movimento reduzido é respeitada. A navegação do site não depende de assistir à apresentação.

Ver [contrato de integração e edição](motion/README.md). Depois de editar a composição em `motion/`, atualizar os arquivos equivalentes em `public/motion/` e repetir a verificação antes de gerar `dist/`.
