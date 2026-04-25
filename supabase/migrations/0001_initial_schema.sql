-- Enable necessary extensions
create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- 1. Profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user',
  full_name text,
  created_at timestamptz default now()
);

-- 2. Obras
create table obras (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  artista text,
  ano text,
  tipo text,
  descricao text,
  material text,
  tecnica text,
  dimensoes text,
  origem text,
  imagem_url text,
  audio_descricao text,
  metadados jsonb default '{}'::jsonb,
  publicado boolean default true,
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- 3. Núcleos Informacionais (Células)
create table nucleos (
  id uuid primary key default gen_random_uuid(),
  tipo text not null, -- 'tag', 'conceito', 'metadado'
  conteudo_original text not null,
  conteudo_normalizado text not null,
  contexto jsonb default '{}'::jsonb,
  metadados jsonb default '{}'::jsonb,
  origem text,
  assinatura_hash text,
  embedding vector(384),
  status_validacao text default 'bruto',
  confianca numeric default 0,
  novidade numeric default 0,
  tensao numeric default 0,
  ressonancia numeric default 0,
  obra_id uuid references obras(id) on delete cascade,
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now(),
  atualizado_em timestamptz default now()
);

-- 4. Tags Públicas (Visão simplificada do núcleo para o visitante)
create table tags (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid references obras(id) on delete cascade,
  nucleo_id uuid references nucleos(id) on delete cascade,
  tag_original text not null,
  tag_normalizada text not null,
  visitante_nome text,
  visitante_hash text,
  grupo_tematico text,
  status text default 'em análise',
  criado_em timestamptz default now()
);

-- 5. Relações (A Teia Semântica)
create table relacoes (
  id uuid primary key default gen_random_uuid(),
  origem_id uuid references nucleos(id) on delete cascade,
  destino_id uuid references nucleos(id) on delete cascade,
  origem_tipo text,
  destino_tipo text,
  destino_externo text,
  tipo_relacao text not null, -- 'closeMatch', 'sameAs', 'broader', etc.
  peso numeric default 0,
  metodo text,
  fonte text,
  status text default 'sugerida',
  criado_em timestamptz default now()
);

-- 6. Fontes Externas Open Data
create table fontes_externas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  url text,
  endpoint text,
  tipo text,
  licenca text,
  autenticacao text,
  padroes text[],
  descricao text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- 7. Resultados Externos (Interoperabilidade)
create table resultados_externos (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid references nucleos(id) on delete cascade,
  fonte text not null,
  external_id text,
  titulo text,
  descricao text,
  url text,
  rights text,
  provider text,
  dados jsonb default '{}'::jsonb,
  match_score numeric default 0,
  tipo_relacao text,
  status text default 'sugerido',
  criado_em timestamptz default now()
);

-- 8. Validações Humanas
create table validacoes (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid references nucleos(id) on delete cascade,
  decisao text not null, -- 'validado', 'rejeitado', 'revisado', 'fundido'
  justificativa text,
  status_anterior text,
  status_novo text,
  validado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

-- 9. Eventos (Trilha Criptográfica/Blockchain leve)
create table eventos (
  id uuid primary key default gen_random_uuid(),
  entidade_tipo text not null,
  entidade_id uuid,
  tipo_evento text not null,
  ator uuid references auth.users(id),
  resumo text,
  payload jsonb default '{}'::jsonb,
  hash_evento text,
  hash_anterior text,
  criado_em timestamptz default now()
);

-- 10. Feedback de Machine Learning
create table feedback_ml (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid references nucleos(id) on delete cascade,
  sugestao_id uuid,
  tipo_feedback text,
  decisao_humana text,
  valor_original text,
  valor_corrigido text,
  justificativa text,
  criado_por uuid references auth.users(id),
  criado_em timestamptz default now()
);

-- 11. Sugestões do Motor de ML
create table ml_sugestoes (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid references nucleos(id) on delete cascade,
  tipo_sugestao text,
  sugestao text,
  score numeric,
  metodo text,
  status text default 'pendente',
  criado_em timestamptz default now()
);

-- 12. Execuções de ML
create table ml_execucoes (
  id uuid primary key default gen_random_uuid(),
  nucleo_id uuid references nucleos(id) on delete cascade,
  tipo_execucao text,
  resumo text,
  status text,
  metricas jsonb default '{}'::jsonb,
  criado_em timestamptz default now()
);

-- Indexes
create index idx_nucleos_conteudo_normalizado on nucleos(conteudo_normalizado);
create index idx_tags_tag_normalizada on tags(tag_normalizada);
create index idx_nucleos_status on nucleos(status_validacao);
create index idx_relacoes_tipo on relacoes(tipo_relacao);
create index on nucleos using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- RLS setup (Very basic, assumes Admin logic uses service_role key to bypass)
alter table obras enable row level security;
alter table tags enable row level security;
alter table nucleos enable row level security;
alter table eventos enable row level security;

-- Public read access to published obras
create policy "Obras publicas visiveis para todos" on obras for select using (publicado = true);
-- Public can insert tags (anonymously or authenticated)
create policy "Publico pode criar tags" on tags for insert with check (true);
create policy "Publico pode ver tags validadas" on tags for select using (status = 'publicado' or status = 'validado');
-- Public can insert nucleos
create policy "Publico pode criar nucleos" on nucleos for insert with check (true);
create policy "Publico pode ler nucleos validados" on nucleos for select using (status_validacao = 'publicado' or status_validacao = 'validado');
