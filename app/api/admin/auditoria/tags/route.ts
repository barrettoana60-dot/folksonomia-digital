import { NextResponse } from 'next/server';
import { getAuditEvents } from '@/lib/core/audit-engine';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export interface AuditTagOption {
  id: string;
  label: string;
  status?: string;
  version?: number;
  eixo?: string;
  updated_at?: string;
}

/**
 * Catálogo para a Auditoria. Ele não depende apenas dos eventos carregados na
 * tela: uma tag recém-criada, sem um evento retornado pela paginação, também
 * precisa poder ser selecionada e ter a sua história consultada.
 */
export async function GET() {
  const tags = new Map<string, AuditTagOption>();

  const add = (tag: AuditTagOption) => {
    if (!tag.id || !tag.label) return;
    const current = tags.get(tag.id);
    tags.set(tag.id, {
      ...current,
      ...tag,
      // Uma etiqueta legível proveniente da identidade tem precedência sobre
      // um identificador técnico que possa existir em um evento antigo.
      label: tag.label || current?.label || tag.id,
    });
  };

  // A instalação mais recente usa tag_identities. A consulta é isolada para
  // continuar compatível com bancos que ainda não receberam essa migração.
  try {
    const { data, error } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, tag, version, eixo, updated_at')
      .order('tag', { ascending: true });

    if (!error) {
      for (const row of data || []) {
        add({
          id: row.tag_id,
          label: row.tag,
          version: row.version,
          eixo: row.eixo,
          updated_at: row.updated_at,
        });
      }
    }
  } catch {
    // A fonte de eventos abaixo mantém a Auditoria disponível offline.
  }

  // Compatibilidade com o esquema inicial do projeto, que armazena tags em
  // uma tabela simples ligada a obras.
  try {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, status, created_at')
      .order('tag_original', { ascending: true });

    if (!error) {
      for (const row of data || []) {
        add({
          id: row.id,
          label: row.tag_original || row.tag_normalizada || row.id,
          status: row.status,
          updated_at: row.created_at,
        });
      }
    }
  } catch {
    // A tabela pode não existir em instalações que usam apenas identidades.
  }

  // Eventos são a fonte canônica de fallback e também cobrem o ledger de
  // demonstração local. O limite alto evita o falso "todas" causado pela
  // paginação padrão de cem registros.
  try {
    const { events } = await getAuditEvents({ limit: 10_000 });
    for (const event of events) {
      if (event.entity_type !== 'tag') continue;
      add({
        id: event.entity_id,
        label: String(event.metadata?.label || event.entity_id),
        status: typeof event.metadata?.status === 'string' ? event.metadata.status : undefined,
        version: event.new_version,
        eixo: typeof event.metadata?.eixo === 'string' ? event.metadata.eixo : undefined,
        updated_at: event.timestamp,
      });
    }
  } catch {
    // Retornamos o que já foi encontrado nas fontes persistidas.
  }

  return NextResponse.json({
    tags: Array.from(tags.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
  });
}
