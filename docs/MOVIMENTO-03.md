# Movimento e exploração espacial — versão 0.3

## Intenção

O visitante deve sentir continuidade entre os ambientes e conseguir explorar arquitetura em profundidade, com movimentos previsíveis e controles simples. O deslocamento de uma fotografia não constitui uma cena tridimensional. A experiência passa a distinguir a imagem editorial da cena com geometria, câmera, perspectiva e materiais renderizados em WebGL.

O acervo e os espaços continuam demonstrativos. Uma modelagem conceitual não equivale a levantamento, planta, dimensões verificadas ou reprodução digital de um imóvel real. Publicar tours de imóveis exige os arquivos e a autorização correspondentes.

## Critérios de qualidade

- Os cenários usam câmera com limites de distância e ângulo. Aproximar, afastar e centralizar são ações explícitas; arrastar não deve retirar o visitante do cenário.
- Mudanças sucessivas de espaço partem do ponto atual da câmera e respeitam a última escolha. Uma animação anterior não pode recuperar a posição inicial no meio de outra.
- Marcadores correspondem às posições dos elementos na cena. A navegação por teclado e pelos controles permanece possível sem depender do arraste.
- Movimento reduzido preserva conteúdo, estados e ações. A navegação não depende de animações longas, deslocamento contínuo ou introdução obrigatória.
- Carregamento ou perda de WebGL mantêm uma alternativa visual e o acesso à coleção, aos detalhes e ao contato. Um erro gráfico não pode bloquear a jornada imobiliária.
- Na tela móvel, o canvas tem área definida. Gestos pertencem à exploração apenas dentro dessa área; controles não ultrapassam a largura da tela.

## Problemas encontrados na implementação anterior

1. O arraste deslocava a mesma imagem em até 32 pixels na horizontal e 18 pixels na vertical; gestos de toque eram descartados. Isso dava pouca resposta e não criava profundidade espacial.
2. A troca de cômodos restaurava o estado inicial da imagem ao desmontar cada contexto GSAP, antes de iniciar a próxima interpolação. Em ações rápidas, esse comportamento podia produzir saltos.
3. O marcador da varanda permanecia em uma porcentagem fixa da tela apesar do movimento da imagem. A âncora visual deixava de corresponder ao ponto observado.

## Verificação

Os oito testes em `tests/spatial.spec.ts` exercitam um navegador real e o contexto WebGL. Eles cobrem renderização de geometria nos quatro ambientes, movimentação da câmera por mouse, toque e teclado, limites de zoom, restauração da perspectiva, alternância imagem/3D, mudanças rápidas de cômodo, proporção do canvas em redimensionamento/tela cheia, perda real do contexto gráfico e usabilidade móvel com movimento reduzido.

As métricas `data-camera`, `data-meshes` e `data-triangles` são diagnósticos internos para verificar a cena renderizada. Não representam informações de imóveis e não aparecem na experiência comercial.

Resultado final em 13/09/2026: os 43 cenários da suíte completa foram validados em Microsoft Edge com um worker, incluindo os oito testes espaciais. A execução completa aprovou 42 casos em 2,2 minutos; o teste restante foi corrigido para aguardar a atualização da rota antes de consultar o canvas e passou na reexecução específica em 7,6 segundos. Isso evita consultar o contexto anterior durante sua desmontagem, sem remover a exigência de WebGL ativo.

A navegação por toque foi exercitada com eventos de toque reais do navegador, e a perda de contexto usou a extensão WebGL correspondente. Os testes de câmera verificam posições numéricas renderizadas e geometria real; não usam imagens estáticas para simular profundidade. A revisão visual dos materiais, luz e enquadramento é complementar a esses testes funcionais.
