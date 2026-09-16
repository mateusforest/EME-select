# Prévia local · Marble EME

Abrir pelo Vite já em execução: http://127.0.0.1:4195/marble-pilot/home/preview/

- Arquivos privados: `tmp/marble-preview/world-100k.spz`, `world-500k.spz` e `world-full-res.spz`, fora deste diretório e ignorados pelo Git.
- Celular até 680px escolhe 100k; desktop escolhe 500k. `?quality=100k` e `?quality=500k` forçam uma variante. `?quality=full-res` abre a resolução completa somente em desktop.
- `camera.json` recebe a pose de revisão. Após inspecionar os dois arquivos reais, a câmera foi aproximada para `[0, 0, -2]`, alvo `[0, -0.35, -6]`, FOV 48°, arquivo girado em 180° em X. Esse recorte reduz o primeiro plano acrescentado pela geração.
- Somente após clicar em **Explorar em 3D** o arquivo SPZ é solicitado.
- O botão **Ver referência** permite comparar com a imagem original.
- Não há rotação automática, áudio, acesso a API/chaves ou rastreamento.
- Navegação limitada, sem deslocamento livre; setas e Home funcionam com o cenário selecionado.
- `prefers-reduced-motion` desativa a inércia de navegação.
- Somente as fontes deste diretório são versionáveis. Os SPZ, o runtime Spark e as capturas permanecem em `tmp`, ignorado pelo Git. Nada foi integrado ao app de produção.

Runtime: Three.js 0.186.0 já instalado no projeto + módulo Spark 2.2.0 obtido de https://sparkjs.dev/releases/spark/2.2.0/spark.module.js. Nenhuma dependência foi adicionada ao package.json.

Fontes: https://sparkjs.dev/docs/ · https://sparkjs.dev/docs/splat-mesh/ · https://sparkjs.dev/docs/spark-renderer/ · https://threejs.org/docs/pages/OrbitControls.html

Este visualizador é para avaliar um cenário ilustrativo de marca. Uma geração a partir de imagem não comprova a geometria de um imóvel real.

## Resultado da inspeção visual inicial

Os arquivos reais abrem com Spark 2.2.0 e Three 0.186.0. A versão 100k contém 98.304 splats; a versão 500k contém 500.000; a completa contém 1.920.000, em 30.061.400 bytes. A primeira é bastante borrada. A segunda preserva melhor as formas; a completa melhora detalhes, mas ainda perde definição de vegetação e arquitetura em relação à imagem. O mundo também acrescenta elementos fora da referência. O teste comprova a integração 3D, mas o resultado **ainda não é indicado para substituir a home premium**.

## Preparar em outro checkout

1. Com Node 22+ e as dependências do projeto instaladas, execute `node marble-pilot/home/preview/prepare.mjs`. Esse comando baixa somente o módulo oficial Spark fixado em 2.2.0, valida SHA-256 e salva em `tmp/marble-preview/vendor`.
2. Copie as saídas privadas da operação já concluída para os três nomes de arquivo acima. Não envie esses arquivos ao Git nem crie novas gerações para abrir o visualizador.
3. Inicie Vite e abra a rota local `/marble-pilot/home/preview/`. Não é necessária chave da API no navegador.

## Verificação realizada

- Desktop 1440×1000: 500k, teclado, limites de câmera, reset, referência/3D, nenhuma exceção JavaScript ou requisição externa.
- Celular 390×844: 100k, sem overflow horizontal, mesmos controles, preferência de movimento reduzido desativa a inércia.
- Desktop 1440×1000: resolução completa carregada, enquadramento final inspecionado visualmente, nenhuma exceção JavaScript.
- Nenhum arquivo SPZ é requisitado antes do clique do visitante. O fallback mantém a imagem quando o arquivo falta.
- Capturas locais: `tmp/marble-preview/final-desktop.png`, `final-mobile.png`, `final-full-res-desktop.png`.
