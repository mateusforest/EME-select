# EME Select — Comercial, Terrenos e Industrial

Versão 0.4.0 · 13/09/2026.

## Integração

Os três ambientes aprovados agora fazem parte da navegação real. A tela inicial e os cenários Litoral, Serra e Urbano foram preservados.

| Ambiente | Categorias dos pontos clicáveis |
| --- | --- |
| Comercial | Lojas, salas comerciais e edifícios corporativos |
| Terrenos | Terrenos urbanos, lotes em condomínio e terras agrícolas |
| Industrial | Galpões, pavilhões e centros de distribuição |

Cada novo cenário tem três pontos que aproximam a imagem e abrem a ficha correspondente. As três imagens de fundo foram preparadas a partir dos conceitos aprovados, removendo a interface desenhada; textos, busca, controles e marcadores são elementos HTML interativos. [Arquivos e prompts de preparação](ASSETS-04.md).

A navegação contempla sete ambientes em computador e celular. No celular, os botões ocupam duas linhas; a paisagem começa pelo ponto principal e permite explorar o restante por arraste. Zoom e deslocamento respeitam as bordas e mantêm a proporção. As transições GSAP e o carregamento antecipado das imagens foram preservados. Nenhum visualizador 3D faz parte dessas telas.

## Dados e funções

O catálogo demonstrativo passou de nove para 18 registros. Os nove novos tipos estão disponíveis na busca, nos filtros, nas fichas, nos favoritos, na comparação e no formulário de apresentação do imóvel.

O seletor antes chamado Região agora se chama Ambiente. O parâmetro de endereço `regiao` foi mantido para compatibilidade. Tipos incompatíveis com um ambiente e filtros de quartos inadequados são descartados na normalização do endereço. Trocar o ambiente também limpa seleções incompatíveis.

Quartos e suítes aparecem somente em imóveis residenciais. Áreas agrícolas são exibidas em hectares e m²; o filtro mantém m² e explica a conversão. Espaços industriais podem apresentar pé-direito e docas. Dados ausentes permanecem distintos de zero; a comparação diferencia critérios não aplicáveis de informações ausentes.

Os atalhos por tipo escolhem uma finalidade com exemplo disponível no catálogo. O formulário mantém a revisão da mensagem pelo visitante antes de abrir o WhatsApp configurado. Esta etapa não altera os serviços de backend ou a disponibilidade real de imóveis.

## Validação

- Build de produção e TypeScript aprovados.
- 28 casos de domínio e busca aprovados: 27 na primeira rodada; um novo caso de tipos incompatíveis em URLs foi validado em uma rodada direcionada de 19 casos do domínio.
- 38 casos de navegador aprovados: 31 na rodada inicial e sete em reteste dirigido, após alinhar contratos dos testes aos nomes finais e corrigir os atalhos por tipo.
- Matriz de 21 combinações: sete cenários em 1920 × 1080, 1440 × 1000 e 390 × 844, verificando cobertura das bordas, proporção, aproximação, restauração e ausência de 3D ou erros de execução.
- Os nove pontos novos abriram as fichas corretas. Busca, filtros, endereços/recarregamento, favoritos, comparação entre segmentos, opções do proprietário, navegação móvel e transições foram exercitados.
- Revisão visual adicional em 1908 × 884, 768 × 1024, 320 × 740 e 390 × 844. O título Industrial foi ajustado no celular e o ponto Lojas foi afastado da navegação inferior em telas largas.
- O caso Comercial passou novamente em 1908 × 884 após o último ajuste: os três pontos não sobrepõem a navegação e abrem as fichas corretas (um caso, 5,8 segundos).
- As cinco imagens anteriores mantiveram os mesmos hashes SHA-256.

São 66 casos distintos no conjunto validado, sem repetir toda a suíte após cada ajuste localizado.

## Entrega

Projeto canônico: `C:/Users/mateu/Downloads/EME-Select`.

Prévia: http://127.0.0.1:4191/?v=0.4.0#/ambientes/comercial

Backup anterior: `work/eme-select-backups/v0.3.3-20260913-122635`, no workspace. A entrega atualiza apenas arquivos novos ou alterados, mantém builds antigos e copia `dist/index.html` por último.
