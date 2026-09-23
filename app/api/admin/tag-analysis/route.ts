import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdmin } from '@/lib/supabase/client';

import {
  runBrainAnalysis,
  type NeuralConnection,
} from '@/lib/ml/brain';

import {
  normalizeForComparison,
} from '@/lib/ml/tag-correlator';

import {
  createTagIdentity,
  generateTagId,
  serializeTagState,
  computeTagDigest,
} from '@/lib/core/tag-identity';

import {
  generateContributionId,
  persistContribution,
  persistVersionChain,
} from '@/lib/core/contribution-network';

export const dynamic = 'force-dynamic';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const PAGE_SIZE = 1000;
const MAX_RETURNED_CONNECTIONS = 100;

// ============================================================================
// TIPOS INTERNOS
// ============================================================================

interface TagRow {
  tag_original: string | null;
}

interface IdentityRow {
  tag_id: string;
  tag: string;
  normalized_label: string;
  version: number;
  digest: string;
  eixo?: string | null;
}

interface StoredRelationRow {
  target_tag_id: string | null;
  target_label: string;
  relation_type: string;
  source: string;
  evidence: string | null;
}

// ============================================================================
// BUSCAR TODAS AS TAGS
// ============================================================================

async function loadAllTags(): Promise<TagRow[]> {
  const rows: TagRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('tag_original')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Erro ao carregar tags: ${error.message}`);
    }

    const page = (data || []) as TagRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

// ============================================================================
// BUSCAR TODAS AS IDENTIDADES
// ============================================================================

async function loadAllTagIdentities(): Promise<IdentityRow[]> {
  const rows: IdentityRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, tag, normalized_label, version, digest, eixo')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Erro ao carregar identidades de tags: ${error.message}`);
    }

    const page = (data || []) as IdentityRow[];

    rows.push(...page);

    if (page.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

// ============================================================================
// GARANTIR IDENTIDADE DA TAG
// ============================================================================

async function ensureTagIdentity(
  tagLabel: string,
  identities: IdentityRow[],
): Promise<{
  identity: IdentityRow;
  created: boolean;
}> {
  const normalizedLabel = normalizeForComparison(tagLabel)
    .replace(/\s+/g, '_');

  const tagId = generateTagId(normalizedLabel);

  const existing = identities.find(
    identity =>
      identity.tag_id === tagId ||
      identity.normalized_label === normalizedLabel,
  );

  if (existing) {
    return {
      identity: existing,
      created: false,
    };
  }

  // Criar nova identidade
  const identity = createTagIdentity({
    tag: tagLabel,
    normalizedLabel,
  });

  const { error } = await supabaseAdmin
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

  // Pode acontecer uma corrida entre duas análises simultâneas.
  // Nesse caso, a identidade já foi criada por outra requisição.
  if (error) {
    const { data: recovered } = await supabaseAdmin
      .from('tag_identities')
      .select('tag_id, tag, normalized_label, version, digest, eixo')
      .eq('tag_id', tagId)
      .maybeSingle();

    if (recovered) {
      return {
        identity: recovered as IdentityRow,
        created: false,
      };
    }

    throw new Error(
      `Não foi possível criar a identidade da tag "${tagLabel}": ${error.message}`,
    );
  }

  // Registrar gênese da identidade
  await persistVersionChain({
    tagId: identity.tagId,
    version: 1,
    previousDigest: null,
    currentDigest: identity.digest,
    eventType: 'genesis',
    actor: 'tag-analysis',
    description: `Identidade criada automaticamente durante a análise da tag "${tagLabel}"`,
  });

  // Registrar contribuição de criação
  if (identity.contributions[0]) {
    await persistContribution(identity.contributions[0]);
  }

  return {
    identity: {
      tag_id: identity.tagId,
      tag: identity.tag,
      normalized_label: identity.normalizedLabel,
      version: identity.version,
      digest: identity.digest,
      eixo: identity.eixo || null,
    },
    created: true,
  };
}

// ============================================================================
// MAPEAR TIPO DA RELAÇÃO PARA O PADRÃO DE RELACIONAMENTO
// ============================================================================

function mapRelationType(connection: NeuralConnection): string {
  switch (connection.connectionType) {
    case 'duplicate':
      return 'skos:exactMatch';

    case 'spelling':
      return 'skos:closeMatch';

    case 'synonym':
      return 'skos:closeMatch';

    case 'family':
      return 'skos:related';

    case 'cross_source':
      return 'skos:related';

    case 'propagated':
      return 'skos:related';

    case 'co_occurrence':
      return 'skos:related';

    default:
      return 'skos:related';
  }
}

// ============================================================================
// PERSISTIR RELAÇÕES DESCOBERTAS
// ============================================================================

async function persistDiscoveredRelations(
  tagId: string,
  connections: NeuralConnection[],
  identities: IdentityRow[],
): Promise<{
  inserted: number;
  skipped: number;
  errors: string[];
  insertedRows: Array<{
    targetTagId: string | null;
    targetLabel: string;
    relationType: string;
    source: string;
    evidence: string | null;
    strength: number;
  }>;
}> {
  const errors: string[] = [];
  const insertedRows: Array<{
    targetTagId: string | null;
    targetLabel: string;
    relationType: string;
    source: string;
    evidence: string | null;
    strength: number;
  }> = [];

  if (connections.length === 0) {
    return {
      inserted: 0,
      skipped: 0,
      errors: [],
      insertedRows: [],
    };
  }

  // Buscar relações que já existem para evitar duplicação.
  const { data: existingData, error: existingError } = await supabaseAdmin
    .from('tag_relations')
    .select('target_tag_id, target_label, relation_type, source, evidence')
    .eq('tag_id', tagId);

  if (existingError) {
    errors.push(
      `Não foi possível consultar relações existentes: ${existingError.message}`,
    );
  }

  const existingRelations = (existingData || []) as StoredRelationRow[];

  const existingKeys = new Set(
    existingRelations.map(relation =>
      [
        relation.target_tag_id || '',
        normalizeForComparison(relation.target_label || ''),
        relation.relation_type,
        relation.source,
      ].join('|'),
    ),
  );

  // Índice das identidades existentes
  const identityMap = new Map<string, IdentityRow>();

  for (const identity of identities) {
    identityMap.set(
      normalizeForComparison(identity.tag),
      identity,
    );

    identityMap.set(
      identity.normalized_label.replace(/_/g, ' '),
      identity,
    );
  }

  const rowsToInsert: Array<{
    tag_id: string;
    target_tag_id: string | null;
    target_label: string;
    relation_type: string;
    source: string;
    evidence: string | null;
  }> = [];

  let skipped = 0;

  for (const connection of connections) {
    const targetLabel = connection.tagB?.trim();

    if (!targetLabel) {
      continue;
    }

    // Nunca criar relação da tag com ela mesma.
    if (
      normalizeForComparison(targetLabel) ===
      normalizeForComparison(connection.tagA)
    ) {
      continue;
    }

    const targetIdentity =
      identityMap.get(normalizeForComparison(targetLabel)) ||
      identityMap.get(
        normalizeForComparison(targetLabel).replace(/\s+/g, ' '),
      );

    const targetTagId = targetIdentity?.tag_id || null;

    const relationType = mapRelationType(connection);

    const source =
      `brain:${connection.connectionType}`;

    const evidence =
      connection.evidence?.length
        ? connection.evidence.join(' | ').slice(0, 2000)
        : null;

    const key = [
      targetTagId || '',
      normalizeForComparison(targetLabel),
      relationType,
      source,
    ].join('|');

    if (existingKeys.has(key)) {
      skipped++;
      continue;
    }

    existingKeys.add(key);

    rowsToInsert.push({
      tag_id: tagId,
      target_tag_id: targetTagId,
      target_label: targetLabel.slice(0, 500),
      relation_type: relationType,
      source,
      evidence,
    });

    insertedRows.push({
      targetTagId,
      targetLabel: targetLabel.slice(0, 500),
      relationType,
      source,
      evidence,
      strength: connection.strength,
    });
  }

  if (rowsToInsert.length === 0) {
    return {
      inserted: 0,
      skipped,
      errors,
      insertedRows,
    };
  }

  const { error: insertError } = await supabaseAdmin
    .from('tag_relations')
    .insert(rowsToInsert);

  if (insertError) {
    errors.push(
      `Erro ao armazenar relações: ${insertError.message}`,
    );

    return {
      inserted: 0,
      skipped,
      errors,
      insertedRows: [],
    };
  }

  return {
    inserted: rowsToInsert.length,
    skipped,
    errors,
    insertedRows,
  };
}

// ============================================================================
// ATUALIZAR DIGEST E CADEIA DA TAG APÓS NOVAS RELAÇÕES
// ============================================================================

async function updateIdentityAfterRelations(
  identity: IdentityRow,
): Promise<{
  updated: boolean;
  version: number;
  digest: string;
}> {
  // Carregar todas as relações atuais
  const { data: relations } = await supabaseAdmin
    .from('tag_relations')
    .select('target_tag_id, target_label, relation_type, source')
    .eq('tag_id', identity.tag_id);

  // Carregar fontes para manter o digest coerente com o estado atual
  const { data: sources } = await supabaseAdmin
    .from('tag_sources')
    .select('source_external_id, source_type, connector')
    .eq('tag_id', identity.tag_id);

  // Carregar objetos vinculados
  const { data: objects } = await supabaseAdmin
    .from('tag_objects')
    .select('object_id, object_type')
    .eq('tag_id', identity.tag_id);

  // Quantidade atual de contribuições
  const { count: contributionCount } = await supabaseAdmin
    .from('tag_contributions')
    .select('contribution_id', {
      count: 'exact',
      head: true,
    })
    .eq('tag_id', identity.tag_id);

  const newVersion = identity.version + 1;

  const snapshot = serializeTagState({
    tagId: identity.tag_id,
    tag: identity.tag,
    normalizedLabel: identity.normalized_label,
    version: newVersion,
    eixo: identity.eixo || undefined,

    relations: (relations || []).map((relation: any) => ({
      targetId: relation.target_tag_id || '',
      targetLabel: relation.target_label || '',
      relationType: relation.relation_type,
      source: relation.source,
      evidence: undefined,
    })),

    sources: (sources || []).map((source: any) => ({
      sourceId: source.source_external_id || undefined,
      label: '',
      type: source.source_type || 'external',
      connector: source.connector || 'unknown',
    })),

    objects: (objects || []).map((object: any) => ({
      objectId: object.object_id,
      title: '',
      objectType: object.object_type || 'obra',
    })),

    contributions: Array.from(
      { length: contributionCount || 0 },
      () => ({}) as any,
    ),
  });

  const newDigest = computeTagDigest(snapshot);

  const { error: updateError } = await supabaseAdmin
    .from('tag_identities')
    .update({
      version: newVersion,
      digest: newDigest,
      updated_at: new Date().toISOString(),
    })
    .eq('tag_id', identity.tag_id);

  if (updateError) {
    throw new Error(
      `Erro ao atualizar identidade: ${updateError.message}`,
    );
  }

  return {
    updated: true,
    version: newVersion,
    digest: newDigest,
  };
}

// ============================================================================
// REGISTRAR CONTRIBUIÇÃO DA ANÁLISE
// ============================================================================

async function registerRelationContribution(
  identity: IdentityRow,
  insertedRelations: Array<{
    targetTagId: string | null;
    targetLabel: string;
    relationType: string;
    source: string;
    evidence: string | null;
    strength: number;
  }>,
  newDigest: string,
): Promise<void> {
  if (insertedRelations.length === 0) {
    return;
  }

  const timestamp = new Date().toISOString();

  const contributionId = generateContributionId({
    tagId: identity.tag_id,
    type: 'relacao',
    timestamp,
  });

  const relationships = insertedRelations
    .map(relation => relation.targetTagId)
    .filter(Boolean) as string[];

  await persistContribution({
    contributionId,
    tagId: identity.tag_id,
    timestamp,
    type: 'relacao',
    content:
      `Análise automática identificou ${insertedRelations.length} relação(ões) para a tag "${identity.tag}".`,
    previousState: identity.digest,
    currentState: newDigest,
    digest: newDigest,
    relationships,
  });
}

// ============================================================================
// POST /api/admin/tag-analysis
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    // ------------------------------------------------------------------------
    // 1. VALIDAR ENTRADA
    // ------------------------------------------------------------------------

    const body = await req.json();
    const tag = body?.tag;

    if (
      !tag ||
      typeof tag !== 'string' ||
      tag.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Tag inválida.',
        },
        { status: 400 },
      );
    }

    const tagClean = tag.trim();
    const normalizedTag = normalizeForComparison(tagClean);

    // ------------------------------------------------------------------------
    // 2. CARREGAR TODAS AS TAGS E IDENTIDADES
    // ------------------------------------------------------------------------

    const [tagRows, identityRows] = await Promise.all([
      loadAllTags(),
      loadAllTagIdentities(),
    ]);

    // Junta:
    // - tags criadas na tabela tags
    // - tags já transformadas em identidade
    // - a própria tag recém recebida
    const allTags = Array.from(
      new Set(
        [
          ...tagRows.map(row => row.tag_original || ''),
          ...identityRows.map(row => row.tag || ''),
          tagClean,
        ]
          .map(value => value.trim())
          .filter(Boolean),
      ),
    );

    // ------------------------------------------------------------------------
    // 3. GARANTIR QUE A TAG NOVA TENHA IDENTIDADE
    // ------------------------------------------------------------------------

    const identityResult = await ensureTagIdentity(
      tagClean,
      identityRows,
    );

    const currentIdentity = identityResult.identity;

    // Adicionar identidade recém-criada ao índice de comparação
    if (identityResult.created) {
      identityRows.push(currentIdentity);
    }

    // ------------------------------------------------------------------------
    // 4. EXECUTAR O CÉREBRO
    // ------------------------------------------------------------------------

    const brainState = await runBrainAnalysis(
      tagClean,
      allTags,
    );

    const neuralMap = brainState.neuralMap || [];

    // ------------------------------------------------------------------------
    // 5. SEPARAR AS RELAÇÕES
    // ------------------------------------------------------------------------

    const duplicates = neuralMap
      .filter(
        connection =>
          connection.connectionType === 'duplicate' ||
          connection.connectionType === 'spelling',
      )
      .map(connection => ({
        tag: connection.tagB,
        score: connection.strength,
        reason: connection.evidence?.[0] || '',
        type: connection.connectionType,
      }));

    const siblings = neuralMap
      .filter(
        connection =>
          connection.connectionType === 'synonym' ||
          connection.connectionType === 'family' ||
          connection.connectionType === 'co_occurrence' ||
          connection.connectionType === 'cross_source',
      )
      .map(connection => ({
        tag: connection.tagB,
        score: connection.strength,
        reason: connection.evidence?.[0] || '',
        type: connection.connectionType,
      }));

    const propagated = neuralMap
      .filter(
        connection =>
          connection.connectionType === 'propagated',
      )
      .map(connection => ({
        tag: connection.tagB,
        score: connection.strength,
        reason: connection.evidence?.[0] || '',
        type: connection.connectionType,
      }));

    // ------------------------------------------------------------------------
    // 6. ERROS ORTOGRÁFICOS
    // ------------------------------------------------------------------------

    const spellingErrors = neuralMap
      .filter(
        connection =>
          connection.connectionType === 'spelling',
      )
      .map(connection => ({
        original: tagClean,
        correctedTo: connection.tagB,
        confidence: connection.strength,
        reason: connection.evidence?.[0] || '',
      }));

    // ------------------------------------------------------------------------
    // 7. FAMÍLIA
    // ------------------------------------------------------------------------

    const { detectTagFamily } =
      await import('@/lib/ml/tag-correlator');

    const family = detectTagFamily(tagClean);

    // ------------------------------------------------------------------------
    // 8. PERSISTIR RELAÇÕES EM tag_relations
    // ------------------------------------------------------------------------

    const relationStorage =
      await persistDiscoveredRelations(
        currentIdentity.tag_id,
        neuralMap,
        identityRows,
      );

    // ------------------------------------------------------------------------
    // 9. ATUALIZAR IDENTIDADE, DIGEST E CADEIA
    // ------------------------------------------------------------------------

    let identityUpdate = {
      updated: false,
      version: currentIdentity.version,
      digest: currentIdentity.digest,
    };

    if (relationStorage.inserted > 0) {
      identityUpdate =
        await updateIdentityAfterRelations(
          currentIdentity,
        );

      // Registrar cadeia verificável
      await persistVersionChain({
        tagId: currentIdentity.tag_id,
        version: identityUpdate.version,
        previousDigest: currentIdentity.digest,
        currentDigest: identityUpdate.digest,
        eventType: 'relation_added',
        actor: 'tag-analysis',
        description:
          `${relationStorage.inserted} relação(ões) adicionada(s) pela análise automática da tag "${tagClean}".`,
      });

      // Registrar contribuição
      await registerRelationContribution(
        currentIdentity,
        relationStorage.insertedRows,
        identityUpdate.digest,
      );
    }

    // ------------------------------------------------------------------------
    // 10. SUGESTÕES
    // ------------------------------------------------------------------------

    const suggestions: string[] = [];

    if (spellingErrors.length > 0) {
      suggestions.push(
        `Possível erro ortográfico detectado. Verifique: ${spellingErrors
          .slice(0, 3)
          .map(error => `"${error.correctedTo}"`)
          .join(', ')}`,
      );
    }

    if (duplicates.length > 0) {
      suggestions.push(
        `Foram encontradas ${duplicates.length} possíveis correspondências de mesma identidade ou variação ortográfica.`,
      );
    }

    if (family) {
      const familyTags = neuralMap
        .filter(
          connection =>
            connection.connectionType === 'family',
        )
        .map(connection => connection.tagB);

      suggestions.push(
        `A tag foi associada à família "${family.name}"${familyTags.length > 0
          ? `, com ${familyTags.length} membro(s) relacionado(s).`
          : '.'}`,
      );
    }

    if (propagated.length > 0) {
      suggestions.push(
        `${propagated.length} relação(ões) foram inferidas por propagação de conhecimento.`,
      );
    }

    if (relationStorage.inserted > 0) {
      suggestions.push(
        `${relationStorage.inserted} nova(s) relação(ões) foram armazenadas na identidade da tag.`,
      );
    }

    if (brainState.totalTraces > 0) {
      suggestions.push(
        `${brainState.totalTraces} registro(s) de rastreamento participaram desta análise.`,
      );
    }

    // ------------------------------------------------------------------------
    // 11. RETORNO PARA O FRONTEND
    // ------------------------------------------------------------------------

    return NextResponse.json({
      success: true,

      data: {
        // --------------------------------------------------
        // IDENTIDADE
        // --------------------------------------------------

        tag: tagClean,

        normalized: normalizedTag,

        tagId: currentIdentity.tag_id,

        version:
          identityUpdate.updated
            ? identityUpdate.version
            : currentIdentity.version,

        digest:
          identityUpdate.updated
            ? identityUpdate.digest
            : currentIdentity.digest,

        identityCreated: identityResult.created,

        // --------------------------------------------------
        // FAMÍLIA
        // --------------------------------------------------

        family,

        // --------------------------------------------------
        // CORRELAÇÕES
        // --------------------------------------------------

        duplicates,

        siblings,

        propagated,

        spellingErrors,

        totalRelated:
          neuralMap.length,

        // --------------------------------------------------
        // MAPA NEURAL
        // --------------------------------------------------

        neuralMap:
          neuralMap.slice(
            0,
            MAX_RETURNED_CONNECTIONS,
          ),

        // --------------------------------------------------
        // DNA
        // --------------------------------------------------

        dna:
          brainState.dnaSignature,

        // --------------------------------------------------
        // APRENDIZADO
        // --------------------------------------------------

        traces:
          brainState.traces.slice(0, 30),

        totalTraces:
          brainState.totalTraces,

        propagatedInsights:
          brainState.propagatedInsights,

        // --------------------------------------------------
        // ARMAZENAMENTO
        // --------------------------------------------------

        storage: {
          totalTagsLoaded:
            allTags.length,

          totalIdentitiesLoaded:
            identityRows.length,

          relationsFound:
            neuralMap.length,

          relationsInserted:
            relationStorage.inserted,

          relationsSkipped:
            relationStorage.skipped,

          storageErrors:
            relationStorage.errors,

          identityCreated:
            identityResult.created,

          identityUpdated:
            identityUpdate.updated,
        },

        // --------------------------------------------------
        // SUGESTÕES
        // --------------------------------------------------

        suggestions,
      },
    });
  } catch (error: unknown) {
    console.error(
      '[TAG ANALYSIS] Erro na análise:',
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Erro desconhecido durante a análise da tag.';

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 },
    );
  }
}