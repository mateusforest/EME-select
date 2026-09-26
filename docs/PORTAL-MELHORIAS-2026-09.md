# Melhorias do portal e cenários — 26/09/2026

## Uso
- Financeiro → Novo lançamento → Repetir este lançamento: mensal, com último mês obrigatório. Gera de uma vez até 60 parcelas como previsão, sem baixa automática. Mantém dia de vencimento (ajustado em meses curtos) e deslocamento da competência. Editar uma regra não reescreve lançamentos já gerados.
- Imóveis → Identificação: CEP consulta ViaCEP, com preenchimento manual disponível; sugestões de cidades da carteira e Vacaria/RS, Balneário Camboriú/SC, Itapema/SC. Meia Praia é bairro de Itapema.
- Apresentação: descrição e características ganham organização visual; Assistente de apresentação usa a conexão privada existente com OpenAI para sugerir textos da ficha salva. Não analisa fotografias. Aplicação explícita ao rascunho, sem aprovação/publicação automática.
- Percurso de fotos → Preparar foto no Ateliê: ESRGAN Slim 2x no navegador, comparação antes/depois, revisão humana obrigatória. Preserva uma cópia privada da foto anterior. Fotos verticais usam enquadramento inteiro. O mínimo de 2000 px no lado maior e 1200 px no menor, grupos e legendas continuam exigidos.
- Publicação: diferencia versão salva de alterações pendentes; mostra o motivo de bloqueio e atalhos para corrigir. Marcar autorização não dispensa aprovação da curadoria.
- Site: diálogos personalizados, galeria DeVille com pré-decodificação, foco de andar sem retângulo e cinco novas cenas para litoral/serra. As imagens de cenário são ilustrativas.

## Implantação
Não exige migração adicional no Supabase: usa os documentos JSON e funções de gravação existentes. A instalação SQLite aplica as novas colunas de foto automaticamente. Nenhum registro de produção é usado como teste. O runtime do Ateliê e suas licenças são hospedados em public/vendor/photo-v1 e carregados apenas sob demanda.

## Verificação e limites
69 testes de domínio/API passaram. Ampliação real no Edge de 900×1600 para 1800×3200 em 148 segundos, com imagem preparada e decodificada. O tempo varia por computador. O resultado pode introduzir artefatos e não recupera detalhes perdidos com garantia; o operador precisa comparar e pode manter o original. O teste da assistência editorial valida o contrato com resposta simulada; depende da conexão OpenAI já configurada para execução real.
