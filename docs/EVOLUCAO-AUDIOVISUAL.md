# EME Select — evolução audiovisual, piloto 01

16/09/2026. Usuário retomou a evolução visual com Higgsfield, Marble, GSAP e “heygenframes” (interpretado provisoriamente como HyperFrames), e escolheu sons ambientes, efeitos discretos e instrumental.

## Estado real

- GSAP já integra o site: câmera fotográfica, aproximações e transições entre rotas.
- Player próprio com primeira faixa pronta: Mar calmo, gravação CC0 servida localmente. Build e reprodução real no Edge verificados; fecha os controles e navega sem interromper.
- Catálogo de plugins consultado: nenhum resultado Marble/World Labs disponível.
- Higgsfield confirmado instalado e habilitado pelo catálogo. Após o usuário marcar o plugin, balance, models_recommend e list_workspaces retornaram `Unknown tool` (-32001). Saldo não pôde ser consultado. Nenhuma geração Higgsfield enviada; não é ausência de instalação nem erro da chave Marble. Navegador alternativo também falhou por timeout.
- HyperFrames possui skills locais; CLI HeyGen e ffmpeg não foram encontrados no PATH nesta verificação. Nenhum vídeo HyperFrames foi renderizado.
- World API autenticada por WORLDLABS_API_KEY já inserida pelo usuário. Piloto privado concluído com marble-1.1: 1.580 créditos utilizados, saldo confirmado de 5.420. Nenhuma compra ou assinatura efetuada. SPZ 100k/500k/full-res, panorama e thumbnail baixados em tmp; ver [resultado](../marble-pilot/home/PILOTO-02.md).

## Som: direção escolhida para produção

1. Litoral: água suave, brisa distante, sem gaivotas repetitivas ou impactos altos.
2. Serra: vento leve na vegetação, natureza sutil, sem um loop óbvio de canto de pássaro.
3. Instrumental: ambient/lounge orgânico, sem voz, sem imitar uma música ou artista; acordes espaçosos, pouca percussão e variações suaves.
4. Efeitos: apenas em ações significativas, muito discretos. Sem som em cada hover, tecla ou clique.

Play voluntário, áudio contínuo entre rotas, volume inicial baixo e mute sempre acessível. A faixa natural Seawash (calm), por craiggroshek, foi selecionada sob CC0 e adicionada ao manifesto; fonte, versão HQ e checksum em audio-mar-calmo-origem.json. Estudos originais de instrumental e SFX foram sintetizados em tmp/audio-pilot, fora da playlist pública: avaliação auditiva pendente. Não há extração do Spotify nem geração musical atribuída ao Higgsfield.

## Primeiro visual: um cenário, referência existente

Referência: public/assets/scene-home.png. Não enviar telas com formulários, dados de clientes ou interface para os geradores.

Higgsfield — briefing pronto; aguarda as ferramentas do plugin funcionarem na sessão:

> Animate this existing premium architectural landscape for a real estate website hero. Almost locked camera, at most a gentle forward drift. Preserve all architecture, window geometry, landscape composition and warm daylight. Subtle foliage motion and soft pool-water movement. Seamless calm visual rhythm. No people, no text, no new buildings, no camera roll, no dramatic zoom, no morphing. Short high-resolution landscape clip; final duration and model must be selected from the live model catalog.

Marble — pedido concreto executado: marble-pilot/home/request.json, com permission.public=false. A geração completou, porém acrescentou construções e mudou o enquadramento. O resultado permanece estudo local; não substitui a home. A restrição de exposição em galeria pública foi respeitada.

GSAP — aplicar no site após escolher o material: mesmo ritmo nas entradas, mudanças de ambiente e abertura do anúncio; preservar rolagem nativa, reduced-motion e controles. Não fingir reconstrução 3D com uma fotografia.

HyperFrames — composição/exportação de vídeos e peças de apresentação, quando houver mídia selecionada. Não substituir o runtime da landing. Se “heygenframes” significar outra ferramenta, confirmar antes de instalar novos produtos.

## Conectar Marble sem plugin

1. Criar chave em https://platform.worldlabs.ai/api-keys.
2. Registrar no .env.local do projeto, como WORLDLABS_API_KEY. Nunca VITE_WORLDLABS_API_KEY.
3. Créditos da World API são separados da assinatura Marble: https://platform.worldlabs.ai/billing.
4. Executar `node scripts/marble-pilot.mjs prepare`: mostra presença da chave e pedido, sem chamada de rede ou custo.
5. Após conferir conta, créditos e condições do piloto, `node scripts/marble-pilot.mjs generate --submit` inicia exatamente uma geração.
6. `node scripts/marble-pilot.mjs status` consulta a operação e salva seu resultado privado em tmp. Falhas não geram retries pagos automáticos.
7. `node scripts/marble-pilot.mjs assets` baixa SPZ 100k/500k, panorama e thumbnail. `assets --full` inclui a versão completa. Arquivos privados ficam em tmp, ignorados pelo git. Não faz nova geração.
8. `node scripts/marble-pilot.mjs credits` consulta o saldo sem custo de geração.
9. Revisar no visualizador local Three.js/Spark, comparar à referência e manter a fotografia na home até um candidato atingir o padrão visual.

Não é necessário colocar a chave na Vercel para produzir cenários offline. O visitante receberá os arquivos prontos, sem gerar um mundo a cada acesso.

Fontes: https://docs.worldlabs.ai/api · https://docs.worldlabs.ai/api/pricing · https://docs.worldlabs.ai/marble/export/gaussian-splat/index
