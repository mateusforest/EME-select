> Histórico: esta integração foi substituída pelo [player próprio Atmosfera EME](ATMOSFERA-EME.md). O iframe Spotify não faz mais parte do site.

# Atmosfera EME — playlist no cabeçalho

Playlist oficial: https://open.spotify.com/playlist/79BMpNy8NQiujxA5qVUGJy

- Ícone de som no cabeçalho público, com painel responsivo e player oficial.
- Nenhum iframe ou contato com Spotify antes de abrir o painel; sem reprodução automática.
- O iframe permanece montado nas trocas internas de página. Fechar o painel, abrir um modal ou um menu remove o iframe e encerra seu áudio.
- Escape fecha o painel e devolve foco ao botão. O portal administrativo não carrega o player.
- O botão Volume explica o ajuste pelo dispositivo. A API de incorporação não expõe setVolume; não existe um slider fictício, controle de mute, reprodução Premium ou autenticação própria implementados.
- Disponibilidade, controles e duração da reprodução seguem o player oficial. Link Abrir no Spotify disponível inclusive se o embed falhar.
- Aviso de privacidade atualizado para o carregamento voluntário do serviço externo.

Verificação: build TypeScript/Vite; abertura sem autoplay; URL da playlist; persistência do iframe na navegação interna; Escape, encerramento e foco; interrupção ao abrir contato; cabeçalho e painel nas larguras 1440, 1024, 390 e 320. O embed real respondeu HTTP 200 e identificou a playlist Chique, de mateus-forest. Não foi iniciada reprodução no teste.

Referência: https://developer.spotify.com/documentation/embeds/references/iframe-api
