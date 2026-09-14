# Home e Condomínios — 0.4.1

## Experiência

- Home: Casas na casa do morro (serra-01), Casas em condomínio na residência em primeiro plano (litoral-02), Apartamentos no edifício direito (urbano-01), Compactos no edifício esquerdo (urbano-02).
- Nova imagem da home muda apenas a antiga cabana para um edifício de compactos. A imagem original scene-home.png permanece preservada.
- Novo ambiente Condomínios com duas entradas: horizontais e verticais. Catálogo transversal usa três imóveis existentes, sem alterar suas regiões ou duplicar registros. Campo condominium registra a classificação explicitamente; não é inferida de palavras em descrições.
- Seção Explore os ambientes abaixo da home com sete destinos; navegação do cenário inclui oito botões contando Todos.
- Arraste, zoom, foco, preenchimento proporcional e transições existentes preservados. Imagens e imóveis continuam ilustrativos. Não houve integração 3D.

## Validação e entrega

- TypeScript e build Vite aprovados na versão 0.4.1.
- 34 testes de domínio e busca aprovados, incluindo classificação explícita de condomínios, coleção transversal e URLs compartilháveis.
- 31 testes de navegação e interação aprovados na seleção pertinente a esta mudança. Conferidos os quatro pontos da home, as duas entradas de Condomínios, os três imóveis da coleção, os sete links da seção Explore, filtros, transições, movimento reduzido e gestos em 320 e 390 px.
- 24 pares de ambiente/resolução verificados em partes: oito cenários em três tamanhos. A execução única atingiu o limite total de 180 segundos no último par, Industrial em 390 × 844; esse par passou isoladamente, incluindo proporção, preenchimento, zoom, busca, ausência de canvas/Three e erros. O prazo da matriz foi ajustado para 300 segundos para futuras execuções; não houve repetição integral.
- Revisão visual da home, Condomínios e Explore em 1440 × 1000, 1908 × 884 e 390 × 844. Dica de arrastar e informações sobre a fachada receberam fundo discreto para leitura.
- Prévia final em http://127.0.0.1:4191/?v=0.4.1#/ conferida no navegador após sincronização: nova imagem carregada, quatro categorias, oito entradas de navegação e sete destinos visuais. Condomínios também carregou sua imagem e as duas entradas corretamente.
- Arquivos de produção salvos em C:/Users/mateu/Downloads/EME-Select e verificados por SHA-256. A versão anterior foi preservada em work/eme-select-backups/v0.4.0-20260913-151150, na área de trabalho do projeto ChatGPT.

## Arquivos de imagem e prompts

Arquivos finais na pasta do usuário: `C:/Users/mateu/Downloads/EME-Select/public/assets/scene-home-v2.png` e `C:/Users/mateu/Downloads/EME-Select/public/assets/scene-condominios.png`.

Geração pela ferramenta integrada image_gen. Ambas PNG 1586 × 992. Referência: public/assets/scene-home.png. Imagens integradas ao projeto, sem interface embutida.

- Home: public/assets/scene-home-v2.png. Origem: exec-78f7350c-6723-4670-8cdb-a6c32999f86f.png.
- Condomínios: public/assets/scene-condominios.png. Origem: exec-b976a6ea-44f0-4c25-9dde-aec1b897316b.png.

### Prompt da home

Use case: precise-object-edit. Edit target: supplied approved EME Select photographic real estate homepage landscape. Create production background asset with same landscape aspect ratio 1586x992. Change ONLY the small wooden A-frame cabin at lower left around x20%,y60% to a refined small three-storey residential building of compact apartments, white limestone, slim warm timber shutters, floor-to-ceiling glass, small green balconies, realistic scale among the trees. It should be a recognizable low-rise apartment building; slightly taller than the old cabin but localized to the left area x12–27%, y48–67%. Preserve absolutely the large horizontal house and swimming pool foreground, the single house uphill in center, the multi-storey residential tower right, lake, mountains, vegetation, warm light, camera angle and spatial composition. Keep the top-left calm ivory sky/water negative space for live headline. Do not add any UI, labels, text, logos or borders. Photorealistic architectural visualization with tactile stone, glass, wood, real-world sophisticated greenery, no cartoon or toy aesthetic. Fill continuous image to all edges, exact same approved warm ivory and forest green feel.

### Prompt de Condomínios

Use case: photorealistic-natural. Reference image is the approved EME Select website visual style, palette, camera, photorealism and composition. Create a NEW production landscape background for the 'Condomínios' environment. Wide landscape 1586x992. A sophisticated Brazilian residential landscape in Rio Grande do Sul with two clear residential typologies sharing one coherent scenic world: horizontal gated community of individual contemporary houses spread organically across center/foreground from x35–66%, and two elegant vertical residential condominium apartment buildings on the right x76–93%, approximately8–12floors, limestone, warm wood brise-soleil, broad green balconies. Left upper45% and top third remain calm off-white warm sky and soft distant hills for readable real HTML headline. At x53%,y68% a prominent detached low horizontal home opening into a private garden, behind it another pair of houses along a landscaped pedestrian street. At x85%,y47% elegant residential towers with gardens and a visible shared landscaped courtyard below. Community park and discreet shared pool connect human-scaled paths in the middle ground, believable spacious masterplan, tasteful subtropical and southern Brazilian vegetation. Low oblique elevated architectural camera; real textures, warm late-afternoon daylight, soft shadows, forest-green plants, ivory stone, no garish blues, no plastic, no simplistic3D. Not isometric miniature. Continuous scenery edge-to-edge including bottom, no blank margins or frame; soft atmospheric upperleft matching reference. No text, labels, numbers, arrows, logos, cards, UI, borders, watermarks. Keep accurate believable architecture and one seamless landscape.
