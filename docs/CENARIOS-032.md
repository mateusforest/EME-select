# EME Select — cenários originais e transições

Versão 0.3.2 · 13/09/2026.

## Resultado

- Início, Litoral, Serra e Urbano voltaram às imagens originais aprovadas, com proporções preservadas, aproximação, arraste e pontos vinculados à arquitetura.
- O interior usa a imagem original de sala, cozinha e varanda. As três opções selecionam enquadramentos dessa mesma imagem.
- A próxima imagem carrega e é decodificada antes da troca de rota. O cenário anterior permanece visível durante a espera e se dissolve em 0,95 segundo sobre o novo. Textos, controles e marcadores anteriores saem em 0,28 segundo.
- A cópia de saída é inerte, oculta da acessibilidade, sem IDs ou dados de interação duplicados e removida ao terminar. Coordenadas do documento mantêm as imagens alinhadas quando a navegação restaura a rolagem no celular.
- Escolhas rápidas dão prioridade ao último destino. Falha ou demora excessiva de imagem não bloqueia a navegação; o destino oferece aviso e controles úteis.
- Movimento reduzido remove as transições prolongadas. Navegação, favoritos, busca, comparação, formulários e tela cheia foram preservados.
- O 3D saiu da experiência ativa. Os fontes dos modelos de estudo permanecem guardados. O usuário adiou o piloto Marble; nenhum mundo foi gerado ou publicado.

## Validação

48 casos distintos validados. A rodada completa inicial de 47 casos teve 44 aprovados; três testes de transição precisaram alinhar a espera da entrada da imagem, a preservação da seleção durante o carregamento da origem e o texto do aviso. Esses três passaram em reteste isolado. Depois da correção visual de alinhamento na rolagem móvel, os quatro testes de transição existentes e um novo caso específico passaram juntos, em 31,6 segundos.

Cobertura: imagens proporcionais; nenhum canvas ou carregamento do visualizador Three.js nas cenas; pontos de seleção; limites de aproximação e arraste; toque, teclado, movimento reduzido e tela cheia; imagens lentas/falhas; cancelamento de destinos antigos; rolagem móvel; filtros e endereços; voltar; favoritos; comparação; formulários e avisos de documentação.

Capturas desktop e mobile inspecionadas, incluindo três momentos da dissolução. O primeiro teste visual móvel identificou uma cópia fixa desalinhada após restaurar a rolagem; a correção foi revisada visualmente e recebeu o teste específico acima. Não houve nova execução integral dos demais casos após essa correção localizada.

A conferência na prévia entregue identificou ainda associações de rótulos da cópia visual com os campos ativos, repetindo seus nomes acessíveis durante a dissolução. Essas referências foram removidas. O mesmo caso móvel recebeu verificações imediatas dos nomes “Região” e “O que você procura?” durante a fase de entrada e passou novamente em 5,4 segundos; o total permanece 48 casos.

Os cinco arquivos originais (`scene-home.png`, `scene-litoral.png`, `scene-serra.png`, `scene-urbano.png`, `interior-living.png`) mantiveram SHA-256 idêntico à versão canônica anterior. Não houve geração, redesenho ou alteração dessas imagens.

## Entrega

Projeto canônico: `C:/Users/mateu/Downloads/EME-Select`.

Prévia: http://127.0.0.1:4191/?v=0.3.2#/ambientes/litoral

Backup anterior à atualização: `work/eme-select-backups/v0.3.1-20260913-104716`, no workspace de trabalho. A sincronização mantém os arquivos antigos do build e atualiza `index.html` por último.
