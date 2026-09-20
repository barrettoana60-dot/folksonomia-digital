-- Tabela para armazenar as tags enviadas para o laboratório de auto-treinamento noturno
CREATE TABLE IF NOT EXISTS public.ml_training_queue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tag TEXT NOT NULL,
    certeza_atual NUMERIC DEFAULT 0,
    tentativas INTEGER DEFAULT 0,
    ultimo_pensamento TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'learning', 'resolved'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index para otimizar a busca noturna
CREATE INDEX IF NOT EXISTS idx_ml_training_status ON public.ml_training_queue(status);
