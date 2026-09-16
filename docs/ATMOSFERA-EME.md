# Atmosfera EME — player próprio

Substitui o iframe do Spotify. O player público usa HTMLAudioElement, sem login, chamadas ao Spotify ou dependências externas de áudio.

## Comportamento

- Controles de faixa anterior, play/pausa, próxima faixa e volume no cabeçalho.
- No celular, play e volume permanecem no cabeçalho; anterior e próxima ficam no painel compacto.
- O áudio permanece montado nas rotas internas públicas. Fechar controles, pressionar Escape, abrir menus ou mudar de página não interrompe a reprodução.
- Reprodução começa exclusivamente por ação do visitante; recarregar a página não reproduz automaticamente.
- Volume inicial de 35%, preferência salva no navegador, silenciar e restaurar volume.
- Algumas plataformas reservam o volume ao dispositivo; nesse caso há orientação explícita.
- Fim da faixa avança na playlist e retorna ao início da sequência. Falhas permitem tentar outra faixa; não há tentativas automáticas infinitas.
- Nenhum arquivo de música é baixado antes de iniciar a reprodução. Apenas o manifesto é consultado.
- Não há controles inativos no site: com a lista vazia, o player não aparece.

## Primeira paisagem sonora — 16/09/2026

O manifesto contém **Mar calmo**, gravação de natureza `Seawash (calm)` por craiggroshek. A própria [página da gravação](https://freesound.org/people/craiggroshek/sounds/176617/) declara CC0 1.0. Foi usado o MP3 HQ público indicado nessa página, sem acessar o original que exige login.

Arquivo: `public/audio/mar-calmo.mp3`, 4min04s, estéreo 44,1 kHz, MP3 VBR (~178 kbps), 5,44 MB. Origem, licença, hash e validação constam em `docs/audio-mar-calmo-origem.json`. O arquivo é servido pelo próprio site e só é solicitado quando o visitante decide reproduzir. Fechar os controles mantém o áudio. Com uma única faixa, anterior/próxima ficam desabilitados e o fim reinicia a faixa; não é prometido loop sem emenda.

Estudos locais de instrumental e efeitos sintetizados estão em `tmp/audio-pilot`, fora da playlist pública e aguardando avaliação auditiva. Não foram extraídas músicas do Spotify.

## Adicionar outras faixas

1. Receber os arquivos e a confirmação de autorização de uso no site.
2. Salvar em `public/audio/` com nomes simples, por exemplo `horizonte.mp3`.
3. Conferir qualidade e volume das faixas e preencher o manifesto na ordem desejada:

```json
{
  "tracks": [
    { "id": "horizonte", "title": "Horizonte", "artist": "Artista", "src": "/audio/horizonte.mp3" }
  ]
}
```

O campo artist é opcional. São aceitos arquivos locais MP3, M4A, OGG e WAV; os nomes devem conter letras, números, hífen ou sublinhado. Os IDs precisam ser únicos. Manter comprovantes e condições de uso em armazenamento privado, fora de public e do repositório.

4. Compilar, verificar reprodução com os arquivos reais e publicar. O player aparece automaticamente quando há faixas válidas no manifesto.

## Verificação

`tests/atmosphere-player.spec.ts` usa PCM silencioso gerado apenas na memória do teste e exercita a reprodução real do navegador. Cobre continuidade ao fechar, Escape, menus e navegação; volume e mute; anterior/próxima/fim de faixa; pausa e retomada; reload sem autoplay; playlist vazia sem Spotify; recuperação após arquivo indisponível; largura do cabeçalho e painel de 320 a 1440 pixels.

Build: `npm run build`. Teste: `npx playwright test tests/atmosphere-player.spec.ts --workers=1`.
