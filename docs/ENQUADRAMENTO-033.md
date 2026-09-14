# EME Select — cenário em toda a área principal

Versão 0.3.3 · 13/09/2026.

## Resultado

O encaixe anterior mantinha a imagem inteira em uma área com recuos, deixando faixas retangulares vazias. Início, Litoral, Serra e Urbano agora preenchem toda a área principal com escala uniforme e recorte proporcional. Não houve alteração nas imagens originais.

No celular, o enquadramento inicial centraliza a edificação principal. Parte da paisagem fica fora do quadro vertical e pode ser explorada por arraste desde a escala mínima. A aproximação da seleção foi ajustada para essa composição. Os pontos continuam vinculados às mesmas posições da fotografia.

Degradês suaves preservam a leitura da busca e dos controles sobre a paisagem, sem introduzir novos painéis retangulares. As transições progressivas, o interior fotográfico e a preferência por movimento reduzido continuam ativos.

## Validação

- Compilação de produção e verificação TypeScript aprovadas.
- 13/13 testes focais aprovados em 2,2 minutos, com um worker: quatro da home, cinco de transição e quatro de cenários/interior.
- Cobertura das quatro bordas verificada nos quatro ambientes, em 1920 × 1080, 1440 × 1000 e 390 × 844, antes e depois de aproximar e afastar.
- Proporção original, escala uniforme, seleção, arraste, limites, restauração, teclado e toque conferidos. Os cenários continuam sem carregar a maquete 3D.
- Capturas de desktop e celular revisadas visualmente, incluindo seleção de imóvel e contraste dos textos.
- Após colocar os pontos clicáveis acima da proteção de contraste, seleção e transição móvel passaram novamente: dois testes em 22,4 segundos. A Serra foi revisada visualmente nessa versão final.

Esta foi a seleção de testes pertinente à correção; não houve nova execução integral dos demais casos históricos do catálogo e dos formulários.

## Entrega

Projeto: `C:/Users/mateu/Downloads/EME-Select`.

Prévia: http://127.0.0.1:4191/?v=0.3.3#/ambientes/litoral

Backup da versão anterior: `work/eme-select-backups/v0.3.2-20260913-113751`, no workspace de trabalho. A sincronização mantém arquivos antigos do build e atualiza `dist/index.html` por último.
