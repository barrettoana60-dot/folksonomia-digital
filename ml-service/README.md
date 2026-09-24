# Folksonomia ML Service

Este diretório é o microserviço de Machine Learning da Folksonomia Digital.

## Runtime

O serviço deve ser executado como **Docker/FastAPI no Render**, não como projeto Vercel.

A arquitetura é:

- Vercel: aplicação Next.js e APIs da interface.
- Render: FastAPI, PyTorch, Transformers, ModernBERT e SigLIP.
- Supabase: persistência de obras, tags, contribuições e resultados das análises.

O arquivo `vercel.json` deste diretório cancela propositalmente qualquer deployment da Vercel deste serviço. Isso evita que o projeto `ml-service` seja tratado como uma aplicação Vercel enquanto o serviço de ML permanece no Render.

## Endpoint visual

O endpoint `POST /analyze-image-tag` recebe:

- `image_url`
- `tag`
- `context`
- `candidate_tags`

e retorna evidência visual comparativa produzida pelo modelo vision-language.

## Deploy

Use o `render.yaml` e o `ml-service/Dockerfile` do repositório.
