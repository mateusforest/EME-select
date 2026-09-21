# Moradas da Serra — experiência DeVille / EME Select

Entrega de 21/09/2026. Rota pública: `/#/empreendimentos/moradas-da-serra`.

## O que foi integrado

- Cabeçalho original da EME, inclusive monograma, player persistente e contato.
- Acesso pelo menu Explorar, menu móvel e chamada na home.
- Vista de apresentação baseada no conceito aprovado, com interface HTML acessível; não é uma captura de tela usada como botão.
- Seleção de duas torres e nove níveis residenciais ilustrativos, com destaque na fachada.
- Maquete Three.js carregada sob demanda: órbita real, aproximação, controles por teclado, seleção de pavimento por raycast e iluminação dia/entardecer/noite.
- Imagens fornecidas pela incorporadora para fachadas, acesso, interiores, lazer e tipologias, com legendas e navegação.
- Consulta via WhatsApp da EME com contexto da torre/andar. Nenhuma mensagem é enviada automaticamente.
- Compartilhamento, modo ampliado, movimento reduzido e alternativa ilustrada caso WebGL não esteja disponível.

## Estado dos dados e limites

A experiência é um **estudo conceitual de apresentação**, não modelo BIM, levantamento técnico, planta aprovada, simulação de insolação ou anúncio de unidades com estoque confirmado. A quantidade/numeração dos níveis e a implantação devem ser validadas com a DeVille. A maquete é reconstruída por código a partir das imagens de referência; não corresponde a um modelo 3D recebido da incorporadora. A vista ilustrada foi gerada com IA a partir da prévia aprovada pelo usuário.

O inventário em `src/developments/moradas.ts` começa vazio. Vazio significa **a confirmar**, jamais disponível ou vendido. O filtro de disponibilidade confirmada mostra um estado vazio explicativo. A função `floorState` distingue dados ausentes, unidades disponíveis e pavimentos sem unidades disponíveis; estes últimos ficam desabilitados quando houver inventário validado. Não há conexão de estoque com Supabase, sistema da incorporadora ou atualização automática por vendas nesta entrega.

As tipologias divulgadas no material fornecido — 2 dormitórios a partir de 52 m² e 3 dormitórios com 71 m² e suíte — aparecem no material original, sem atribuição inventada a um andar ou final. Não há preços, reservas, cobrança, exclusividade ou regularidade documental declarados.

Para operação comercial: receber/validar plantas ou modelo 3D, cadastro de torres/andares/unidades, preços e estoque; então conectar inventário autenticado e auditável. Autorizações de divulgação e conteúdo comercial seguem o fluxo da EME.

## Mídia

`public/assets/developments/moradas-da-serra/` contém 12 imagens comerciais da DeVille fornecidas pelo usuário neste atendimento e um `hero.webp` conceitual. Originais preservados. `scripts/prepare-deville-assets.mjs` documenta a preparação local; não é executado no build nem depende de arquivos do usuário em produção.

## Validação

`tests/development.spec.ts` cobre estoque desconhecido/vendido, seleção de torres e andares, galerias, foco após fechamento, teclado 3D, mudança real de câmera, luzes, perda de contexto gráfico, mobile, movimento reduzido e entradas pela home/menu. A revisão inclui build TypeScript/Vite e testes de regressão do player, catálogo e transições públicas. Nenhuma migration ou alteração de dados privados é necessária.
