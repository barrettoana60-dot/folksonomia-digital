# Cofre Semântico Vivo

Cada envio de tag é uma contribuição individual — não apenas uma cópia de um
conceito canônico. Por isso, uma mesma tag pode ter várias submissões, cada uma
com UUID, envelope criptográfico e cadeia de auditoria próprios.

## Garantias

- Metadados privados: JSON canônico → gzip → AES-256-GCM. O envelope fica em
  `tag_secure_records.encrypted_metadata` e nunca é devolvido por rotas públicas.
- Integridade: SHA-256 identifica o estado e cada evento é encadeado com o hash
  do evento anterior. SHA-256 não é usado como cifra.
- Busca protegida: hipóteses visuais geram índices cegos HMAC; os termos que
  coincidem não são gravados na tabela de correlações.
- Imutabilidade: `tag_secure_records` e `semantic_vault_audit` só aceitam
  inserção. O banco valida posição e hash anterior de cada cadeia.
- Falha fechada: sem uma `ENCRYPTION_KEY` válida, sem service role do Supabase
  ou sem a tabela de auditoria disponível, nenhuma contribuição é confirmada.
- Curadoria humana: análises visuais e correlações começam sempre como
  sugestões. Elas não publicam relações culturais automaticamente.

O rótulo cultural necessário à navegação e à interoperabilidade pode continuar
no manifesto público. Nome da pessoa, identificadores do visitante, evidências,
saída do modelo e demais contexto de submissão ficam somente no envelope.

## Análise visual

`lib/ml/visual-context.ts` usa um modelo multimodal configurado no servidor
(`GEMINI_API_KEY`) para imagens públicas. A entrada passa por limites de tamanho,
tipo de imagem, bloqueio de endereços privados, resolução DNS e timeout. A saída
tem esquema restrito, não infere atributos sensíveis e é armazenada apenas no
envelope. Sem provedor ou imagem segura, a aplicação registra explicitamente que
não houve inferência visual.

## Migração e configuração

1. Gere `ENCRYPTION_KEY` aleatória com pelo menos 32 bytes, por exemplo
   `openssl rand -base64 48`, e configure-a apenas no ambiente do servidor.
2. Configure `SUPABASE_SERVICE_ROLE_KEY`; as tabelas do cofre não têm política
   pública de leitura ou escrita.
3. Aplique todas as migrações, incluindo
   `supabase/migrations/0014_secure_tag_ledger.sql` após `0010` e `0011`.
4. Opcionalmente configure `GEMINI_API_KEY` e `GEMINI_VISION_MODEL` para a
   análise multimodal.
5. Se um worker de curadoria precisar anexar pulsos posteriores, configure
   `LIVE_VAULT_MUTATION_SECRET` e envie-o somente pelo cabeçalho interno
   `x-live-vault-mutation-secret`. A interface pública é somente de leitura.

## Interoperabilidade pública

O exportador JSON-LD prefere a chave de submissão:

`/api/interop/jsonld?submission_id=<uuid>`

Ele expõe o UUID, a identidade canônica, hashes verificáveis, posição/hash da
cadeia e o fato de que os metadados foram cifrados. Não expõe ciphertext,
índices cegos, termos visuais, dados do visitante nem conteúdo de modelo. O
parâmetro legado `tag` continua disponível apenas para registros históricos e
pode ser ambíguo quando há várias submissões com o mesmo rótulo.
