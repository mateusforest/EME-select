# Apresentação opcional EME Select

Abertura HTML original de 4,8 segundos, construída como composição HyperFrames e animada com GSAP local. A marca aprovada é revelada por painéis que sugerem uma dobra, acompanhada das frases “Seu próximo lugar.” e “Uma escolha especial.”. Não é uma captura de tela animada e não exige uma renderização em vídeo.

## Integração no site

Copiar `index.html`, `preview.html`, `preview.js`, `assets/` e `vendor/` para `public/motion/`. Manter esta pasta `motion/` como fonte editável. Os arquivos `DESIGN.md`, `README.md`, `hyperframes.json` e `qa/` documentam autoria e verificação; não precisam ser publicados.

Abrir `/motion/preview.html` a partir de uma ação opcional, por exemplo, “Apresentação”. Não executar a peça antes de liberar a navegação principal. Há duas formas de uso:

- Página independente: um link abre a apresentação, e “Voltar à coleção” retorna para `/`.
- Modal do React: carregar `preview.html` em um iframe com `title="Apresentação da EME Select"`. O botão de retorno envia `{ type: 'eme-select:close-intro' }` à janela pai usando a mesma origem. O pai deve validar `event.origin === window.location.origin` e `event.source === iframe.contentWindow` antes de fechar. Ao fechar, remover o iframe para encerrar a timeline e restaurar o foco ao botão que abriu a apresentação. O modal também deve oferecer Escape e fechamento próprio.

O endereço deve ser servido por HTTP. O arquivo fonte `index.html` é a composição fixa 1920 × 1080; `preview.html` faz a adaptação proporcional a cada tela. O pequeno texto de apoio fora do canvas permanece legível no celular.

## Reprodução e acessibilidade

- A peça abre no quadro final, sem autoplay.
- Reproduzir, pausar, recomeçar e posição da apresentação são controles nativos acessíveis por teclado.
- `prefers-reduced-motion: reduce` mostra o quadro final e desabilita a animação. A preferência é atualizada se o sistema a alterar durante a visita.
- Ao ocultar a aba, a timeline pausa.
- Sem áudio, CDN, cookies ou requisições a terceiros.
- O logo usa o PNG aprovado com `object-fit: contain` e fundo integrado por composição de cor; nenhuma proporção é alterada.

## Ativos e licenças

- `assets/brand-lockup.png`: cópia inalterada de `output/eme-select-assets/01-logo-verde-fundo-branco.png`, aprovado pelo usuário.
- `vendor/gsap.min.js`: cópia da dependência local já utilizada no projeto, GSAP 3.15.0; aviso de licença mantido no próprio arquivo.
- Fontes de sistema: Georgia e Arial. O conteúdo funciona sem baixar fontes.

## Verificação

HyperFrames 0.8.35, 2026-09-13:

- `lint`: passou, zero erros e zero avisos.
- `validate`: passou, zero erros, zero avisos e zero falhas de contraste. Razões verificadas: 10,58:1 no verde principal e 4,91:1 no verde secundário.
- `inspect --samples 9`: passou, zero ocorrências de transbordamento ou sobreposição; amostras entre 0,267 e 4,533 segundos.
- Duração da composição: 4,8 segundos.

O script complementar `animation-map.mjs` da skill não pode iniciar porque sua dependência de desenvolvimento `@hyperframes/producer` não está instalada no pacote do CLI. Isso não afeta as três verificações acima nem a reprodução pelo GSAP. A timeline é finita, criada de forma síncrona e registrada em `window.__timelines['eme-select-dobra']`.

Na revisão integrada do site, conferir: abrir apresentação, reproduzir, pausar, recomeçar, arrastar a posição, retorno à coleção, foco do modal e preferência de movimento reduzido.
