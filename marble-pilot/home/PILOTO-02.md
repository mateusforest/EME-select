# Piloto 02 — cenário privado da home

16/09/2026. Retomada autorizada pelo usuário, que configurou a chave World API e instalou Higgsfield.

## Resultado registrado

- Modelo: marble-1.1, image-to-world, referência pública original scene-home.png.
- Operação: 8c888dd7-f373-40be-b0d5-004f8907829f.
- Mundo: 7dd51fb1-ceb7-417c-92b3-70c7c6aa1616.
- [Abrir no Marble, com a conta proprietária](https://marble.worldlabs.ai/world/7dd51fb1-ceb7-417c-92b3-70c7c6aa1616).
- Estado: concluído sem erro. Uma única geração; sem retries pagos.
- Privacidade confirmada: public=false, allow_id_access=false, sem leitores adicionais.
- Custo confirmado: 1.580 créditos. Saldo inicial 7.000; saldo final consultado 5.420.
- Nenhuma compra de créditos, assinatura ou exportação paga de malha HQ.

## Arquivos privados

O script scripts/marble-pilot.mjs salva estado e resultados completos em tmp, ignorado pelo git. A chave fica somente no .env.local local; não é usada pelo navegador nem incluída na Vercel para este piloto.

| Arquivo | Tamanho |
| --- | ---: |
| world-100k.spz | 1.357.370 bytes |
| world-500k.spz | 7.825.050 bytes |
| world-full-res.spz | 30.061.400 bytes |
| panorama.jpg | 13.737.331 bytes |
| thumbnail.jpg | 33.956 bytes |

## Avaliação visual

A versão 100k perde nitidez nas árvores e arquitetura. A versão 500k melhora a definição, mas a geração acrescentou coberturas/piscinas no primeiro plano e deixou a casa original distante. Também foi inspecionada a resolução completa de 1.920.000 splats, com câmera mais próxima: o detalhe melhora, mas a arquitetura e a vegetação continuam abaixo da fotografia original. Não há equivalência fiel com a composição de referência. Esse material é um cenário ilustrativo, não a reconstrução de um imóvel real.

Decisão: manter como estudo local com comparação da referência; não trocar a home por este primeiro resultado. O visualizador está em marble-pilot/home/preview, com instruções de preparo, câmera limitada, reset e comparação. Desktop/celular, carregamento após clique, teclado e movimento reduzido foram verificados. Não iniciar novas gerações automaticamente.

## Outros materiais

Som real de mar, CC0, integrado ao manifesto do player. Instrumental e SFX originais permanecem estudos em tmp/audio-pilot para escuta. Nenhum clipe Higgsfield foi gerado: plugin aparece instalado, porém as chamadas retornaram Unknown tool nesta sessão.
