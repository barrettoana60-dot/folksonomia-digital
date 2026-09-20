import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import {
  createTagIdentity,
  applyTagUpdate,
  generateTagId,
  serializeTagState,
  computeTagDigest,
  toDisplayFormat,
  type TagIdentity,
  type TagSource,
  type TagRelation,
} from '@/lib/core/tag-identity';
import {
  discoverCulturalRelations,
} from '@/lib/connectors/cultural-interop';
import {
  persistContribution,
  persistVersionChain,
  generateContributionId,
} from '@/lib/core/contribution-network';

export const dynamic = 'force-dynamic';

// ─── GET: Consultar identidade de tag ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tagParam = searchParams.get('tag') || '';
  const tagIdParam = searchParams.get('tag_id') || '';

  if (!tagParam && !tagIdParam) {
    return NextResponse.json({ success: false, error: 'Parâmetro "tag" ou "tag_id" obrigatório.' }, { status: 400 });
  }

  try {
    let tagId = tagIdParam;
    let normalizedLabel = '';

    if (!tagId && tagParam) {
      normalizedLabel = normalizeForComparison(tagParam).replace(/\s+/g, '_');
      tagId = generateTagId(normalizedLabel);
    }

    // Buscar identidade no banco
    const { data: identityRow, error: idErr } = await supabaseAdmin
      .from('tag_identities')
      .select('*')
      .eq('tag_id', tagId)
      .maybeSingle();

    if (idErr) throw idErr;

    if (!identityRow) {
      return NextResponse.json({ success: false, error: 'Identidade não encontrada.' }, { status: 404 });
    }

    // Carregar relações
    const { data: relations } = await supabaseAdmin
      .from('tag_relations')
      .select('*')
      .eq('tag_id', tagId)
      .order('created_at', { ascending: true });

    // Carregar fontes
    const { data: sources } = await supabaseAdmin
      .from('tag_sources')
      .select('*')
      .eq('tag_id', tagId)
      .order('match_score', { ascending: false });

    // Carregar objetos
    const { data: objects } = await supabaseAdmin
      .from('tag_objects')
      .select('*, obras(titulo)')
      .eq('tag_id', tagId);

    // Carregar cadeia de versões
    const { data: versionChain } = await supabaseAdmin
      .from('tag_version_chain')
      .select('*')
      .eq('tag_id', tagId)
      .order('version', { ascending: true });

    // Carregar contribuições (resumo)
    const { data: contributions, count: contribCount } = await supabaseAdmin
      .from('tag_contributions')
      .select('contribution_id, timestamp, contribution_type, current_state, digest, contributor_hash', { count: 'exact' })
      .eq('tag_id', tagId)
      .order('timestamp', { ascending: false })
      .limit(20);

    const fullIdentity = {
      tag: identityRow.tag,
      tagId: identityRow.tag_id,
      version: identityRow.version,
      digest: identityRow.digest,
      normalizedLabel: identityRow.normalized_label,
      eixo: identityRow.eixo,
      createdAt: identityRow.created_at,
      updatedAt: identityRow.updated_at,
      relations: (relations || []).map(r => ({
        targetId: r.target_tag_id || '',
        targetLabel: r.target_label,
        relationType: r.relation_type,
        source: r.source,
        evidence: r.evidence,
      })),
      sources: (sources || []).map(s => ({
        sourceId: s.source_external_id,
        label: s.label,
        url: s.url,
        type: s.source_type,
        connector: s.connector,
        matchScore: s.match_score,
        skosRelation: s.skos_relation,
      })),
      objects: (objects || []).map(o => ({
        objectId: o.object_id,
        title: (o as any).obras?.titulo || o.title || '',
        objectType: o.object_type,
        url: undefined,
      })),
      contributions: (contributions || []).map(c => ({
        contributionId: c.contribution_id,
        tagId,
        timestamp: c.timestamp,
        type: c.contribution_type,
        currentState: c.current_state,
        digest: c.digest,
        contributorHash: c.contributor_hash,
        relationships: [],
      })),
      provenance: (versionChain || []).map(v => ({
        eventType: v.event_type,
        occurredAt: v.occurred_at,
        previousDigest: v.previous_digest,
        currentDigest: v.current_digest,
        version: v.version,
        actor: v.actor,
        description: v.description,
      })),
    };

    return NextResponse.json({
      success: true,
      data: {
        identity: fullIdentity,
        display: toDisplayFormat(fullIdentity as unknown as TagIdentity),
        contributionsTotal: contribCount || 0,
        versionChainLength: (versionChain || []).length,
      },
    });
  } catch (err) {
    console.error('[TagIdentity GET]', err);
    return NextResponse.json({ success: false, error: 'Erro ao consultar identidade.' }, { status: 500 });
  }
}

// ─── POST: Criar ou atualizar identidade de tag ───────────────────────────────

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Corpo da requisição inválido.' }, { status: 400 });
  }

  const { tag, objectId, objectTitle, eixo, contributorHash, action } = body;

  if (!tag || typeof tag !== 'string' || tag.trim().length < 2) {
    return NextResponse.json({ success: false, error: 'Campo "tag" obrigatório (mínimo 2 caracteres).' }, { status: 400 });
  }

  const normalizedLabel = normalizeForComparison(tag.trim()).replace(/\s+/g, '_');
  const tagId = generateTagId(normalizedLabel);

  try {
    // Verificar se já existe
    const { data: existing } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, version, digest')
      .eq('tag_id', tagId)
      .maybeSingle();

    const now = new Date().toISOString();

    if (!existing) {
      // ─── CRIAR NOVA IDENTIDADE ───────────────────────────────────────────
      const identity = createTagIdentity({
        tag: tag.trim(),
        normalizedLabel,
        eixo,
        objectId,
        objectTitle,
        contributorHash,
      });

      // Persistir identidade principal
      const { error: insertErr } = await supabaseAdmin
        .from('tag_identities')
        .insert({
          tag_id: identity.tagId,
          tag: identity.tag,
          normalized_label: identity.normalizedLabel,
          version: identity.version,
          digest: identity.digest,
          eixo: identity.eixo || null,
          created_at: identity.createdAt,
          updated_at: identity.updatedAt,
        });

      if (insertErr && !insertErr.message.includes('duplicate')) {
        throw insertErr;
      }

      // Persistir objeto vinculado
      if (objectId) {
        await supabaseAdmin.from('tag_objects').insert({
          tag_id: tagId,
          object_id: objectId,
          object_type: 'obra',
          title: objectTitle || null,
        }).throwOnError().then(() => null).catch(() => null);
      }

      // Persistir gênese na cadeia de versões
      await persistVersionChain({
        tagId: identity.tagId,
        version: 1,
        previousDigest: null,
        currentDigest: identity.digest,
        eventType: 'genesis',
        actor: 'user_contribution',
        description: `Tag "${identity.tag}" registrada como identidade computacional`,
      });

      // Persistir contribuição de criação
      if (identity.contributions[0]) {
        await persistContribution(identity.contributions[0]);
      }

      // Disparar descoberta assíncrona de relações (não bloqueia resposta)
      void discoverAndPersistRelations(tagId, tag.trim(), identity.digest, identity.version);

      return NextResponse.json({
        success: true,
        data: {
          tagId: identity.tagId,
          tag: identity.tag,
          version: identity.version,
          digest: identity.digest,
          normalizedLabel: identity.normalizedLabel,
          status: 'created',
        },
      });
    } else {
      // ─── ATUALIZAR IDENTIDADE EXISTENTE ─────────────────────────────────
      if (action === 'discover') {
        // Forçar nova rodada de descoberta
        void discoverAndPersistRelations(tagId, tag.trim(), existing.digest, existing.version);
        return NextResponse.json({
          success: true,
          data: {
            tagId,
            version: existing.version,
            digest: existing.digest,
            status: 'discovery_triggered',
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          tagId,
          version: existing.version,
          digest: existing.digest,
          status: 'exists',
        },
      });
    }
  } catch (err) {
    console.error('[TagIdentity POST]', err);
    return NextResponse.json({ success: false, error: 'Erro ao criar identidade da tag.' }, { status: 500 });
  }
}

// ─── DESCOBERTA E PERSISTÊNCIA DE RELAÇÕES ────────────────────────────────────

/**
 * Rotina de descoberta assíncrona de correspondências em fontes externas.
 *
 * Fluxo:
 *   TAG → IDENTIFICAÇÃO → BUSCA → FONTES EXTERNAS → NORMALIZAÇÃO → RELACIONAMENTOS → REGISTRO
 *
 * Cada relação externa preserva a sua origem.
 */
async function discoverAndPersistRelations(
  tagId: string,
  tagLabel: string,
  previousDigest: string,
  currentVersion: number,
): Promise<void> {
  try {
    const discovery = await discoverCulturalRelations(tagLabel);

    if (discovery.tagSources.length === 0 && discovery.derivatives.length === 0) return;

    // Persistir fontes externas descobertas
    if (discovery.tagSources.length > 0) {
      const sourcesRows = discovery.tagSources.map(s => ({
        tag_id: tagId,
        source_external_id: s.sourceId || null,
        label: s.label.slice(0, 500),
        url: s.url || null,
        source_type: s.type,
        connector: s.connector,
        match_score: s.matchScore || null,
        skos_relation: s.skosRelation || null,
      }));

      await supabaseAdmin.from('tag_sources').insert(sourcesRows).then(() => null).catch(() => null);
    }

    // Persistir relações descobertas
    if (discovery.derivatives.length > 0) {
      const relationsRows = discovery.derivatives.map(d => ({
        tag_id: tagId,
        target_tag_id: null,
        target_label: d.title.slice(0, 300),
        relation_type: d.relation,
        source: d.source,
        evidence: d.url || null,
      }));

      await supabaseAdmin.from('tag_relations').insert(relationsRows).then(() => null).catch(() => null);
    }

    // Recalcular digest após relações adicionadas
    const { data: updatedIdentity } = await supabaseAdmin
      .from('tag_identities')
      .select('*')
      .eq('tag_id', tagId)
      .maybeSingle();

    if (!updatedIdentity) return;

    const { data: relations } = await supabaseAdmin
      .from('tag_relations')
      .select('target_tag_id, relation_type, source')
      .eq('tag_id', tagId);

    const { data: sources } = await supabaseAdmin
      .from('tag_sources')
      .select('source_external_id, source_type, connector')
      .eq('tag_id', tagId);

    const snapshot = serializeTagState({
      tagId,
      tag: updatedIdentity.tag,
      normalizedLabel: updatedIdentity.normalized_label,
      version: currentVersion + 1,
      eixo: updatedIdentity.eixo,
      relations: (relations || []).map(r => ({
        targetId: r.target_tag_id || '',
        targetLabel: '',
        relationType: r.relation_type,
        source: r.source,
      })),
      sources: (sources || []).map(s => ({
        sourceId: s.source_external_id,
        label: '',
        type: s.source_type as TagSource['type'],
        connector: s.connector,
      })),
      objects: [],
      contributions: [],
    });
    const newDigest = computeTagDigest(snapshot);
    const newVersion = currentVersion + 1;

    // Atualizar identidade com novo digest e versão
    await supabaseAdmin
      .from('tag_identities')
      .update({
        version: newVersion,
        digest: newDigest,
        updated_at: new Date().toISOString(),
      })
      .eq('tag_id', tagId)
      .then(() => null).catch(() => null);

    // Registrar na cadeia de versões
    await persistVersionChain({
      tagId,
      version: newVersion,
      previousDigest,
      currentDigest: newDigest,
      eventType: 'relation_added',
      actor: `connector:${Object.keys(discovery.summary).join(',')}`,
      description: `${discovery.tagSources.length} fonte(s) e ${discovery.derivatives.length} relação(ões) descobertas`,
    });

    // Contribuição de descoberta
    const contribId = generateContributionId({
      tagId,
      type: 'fonte',
      timestamp: new Date().toISOString(),
    });
    await persistContribution({
      contributionId: contribId,
      tagId,
      timestamp: new Date().toISOString(),
      type: 'fonte',
      content: `Descoberta automática: ${discovery.derivatives.map(d => d.source).join(', ')}`,
      previousState: previousDigest,
      currentState: newDigest,
      digest: newDigest,
      relationships: [],
    });
  } catch (err) {
    console.warn('[TagIdentity] Descoberta de relações falhou:', err instanceof Error ? err.message : err);
  }
}
