# Cofre Semântico Vivo

O cofre usa somente contribuições persistidas por usuários. Catálogos de tags fixas não participam da rede nem da exportação.

## Segurança e integridade

- Carga: JSON canônico → gzip nível 9 → AES-256-GCM.
- Chave: derivada no servidor com `scrypt`; nunca é devolvida pela API.
- Integridade: SHA-256 canônico para carga, hash de cruzamento e cadeia de auditoria.
- Código genético: `FSDNA1-…`; é identificador verificável, não uma chave.
- Falha fechada: sem `ENCRYPTION_KEY`, ações de selagem, validação e criação de relações retornam erro 503 e não gravam envelope em claro.

## Ativação

1. Crie `ENCRYPTION_KEY` com valor aleatório de alta entropia no ambiente de produção.
2. Aplique a migração `supabase/migrations/0010_semantic_vault_audit.sql`.
3. Configure as variáveis do Supabase e faça o deploy.

O JSON-LD em `/api/interop/jsonld?tag=<contribuição>` expõe apenas metadados públicos, hashes de verificação e o código genético. A carga de auditoria fica cifrada em `semantic_vault_audit.encrypted_payload`.
