# Rede de Interoperabilidade Cultural

A aba de interoperabilidade é uma projeção viva das tabelas `tags`, `obras`,
`relacoes`, `resultados_externos` e `semantic_correlations`. Não há catálogo
demonstrativo: todas as tags válidas são lidas, paginadas e exibidas.

Cada conceito normalizado recebe um DNA público `FDNA1…`. As formas originais,
ocorrências, obras e núcleos permanecem na proveniência do conceito. Assim,
variações de caixa e acentuação não dividem artificialmente o mesmo percurso
cultural, mas continuam auditáveis.

## Segurança e implantação

1. Execute a migração `supabase/migrations/0010_interoperability_identity.sql`.
2. Defina `INTEROP_DNA_KEY` no ambiente de produção com um segredo aleatório de
   pelo menos 32 bytes. Com essa chave, o DNA é um HMAC opaco; sem ela, o sistema
   usa somente uma impressão SHA-256 determinística, que não deve ser tratada
   como criptografia.
3. Configure `EUROPEANA_API_KEY` para habilitar a consulta Europeana. Brasiliana
   Museus/Tainacan e IBRAM são consultados pelos conectores existentes quando
   estão disponíveis.

As relações trazem `layer` (`factual`, `inferred` ou `validated`), confiança,
mecanismo e explicação. O botão **Aprender conexões** executa a recuperação nas
fontes e aciona o relatório semântico/RAG já integrado ao painel administrativo.
