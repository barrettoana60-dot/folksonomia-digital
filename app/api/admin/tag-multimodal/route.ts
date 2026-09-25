import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison } from '@/lib/ml/tag-correlator';
import { mlClient } from '@/lib/ml/ml-client';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const PAGE_SIZE = 1000;
const MAX_IMAGE_INFERENCES_PER_REQUEST = 2;
const MAX_MATRIX_TAGS = 10;
const MIN_PAIR_SUPPORT = 2;

type TagRow = {
  tag_original: string | null;
  tag_normalizada?: string | null;
  obra_id: string | null;
  visitante_hash: string | null;
};

type ObraRow = {
  id: string;
  titulo: string;
  descricao?: string | null;
  artista?: string | null;
  ano?: string | null;
  material?: string | null;
  tecnica?: string | null;
  origem?: string | null;
  imagem_url?: string | null;
};

type TagStat = {
  tag: string;
  normalized: string;
  uses: number;
  people: number;
  works: number;
  _people: Set<string>;
  _works: Set<string>;
};

function cleanLabel(value: string): string {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

async function loadAllTagRows(): Promise<TagRow[]> {
  const rows: TagRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from('tags')
      .select('tag_original,tag_normalizada,obra_id,visitante_hash')
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(`Erro ao carregar tags: ${error.message}`);

    const page = (data || []) as TagRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

async function loadObras(ids: string[]): Promise<Map<string, ObraRow>> {
  const out = new Map<string, ObraRow>();
  if (ids.length === 0) return out;

  for (let i = 0; i < ids.length; i += 200) {
    const chunk = ids.slice(i, i + 200);
    const { data, error } = await supabaseAdmin
      .from('obras')
      .select('id,titulo,descricao,artista,ano,material,tecnica,origem,imagem_url')
      .in('id', chunk);

    if (error) throw new Error(`Erro ao carregar obras: ${error.message}`);

    for (const row of (data || []) as ObraRow[]) {
      out.set(row.id, row);
    }
  }

  return out;
}

function weightedMean(parts: Array<[number | null | undefined, number]>): number | null {
  const valid = parts.filter(([value]) => typeof value === 'number' && Number.isFinite(value)) as Array<[number, number]>;
  if (valid.length === 0) return null;

  const totalWeight = valid.reduce((sum, [, weight]) => sum + weight, 0);
  if (totalWeight <= 0) return null;

  return valid.reduce((sum, [value, weight]) => sum + value * weight, 0) / totalWeight;
}

function cosine(a: number[], b: number[]): number | null {
  if (!a.length || !b.length || a.length !== b.length) return null;

  let dot = 0;
  let aa = 0;
  let bb = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }

  if (!aa || !bb) return null;
  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

function toUnitInterval(cosineScore: number | null): number | null {
  if (cosineScore === null || !Number.isFinite(cosineScore)) return null;
  return Math.min(1, Math.max(0, (cosineScore + 1) / 2));
}

function statsMap(rows: TagRow[]): Map<string, TagStat> {
  const map = new Map<string, TagStat>();

  for (const row of rows) {
    const label = cleanLabel(row.tag_original || '');
    if (!label) continue;

    const normalized = normalizeForComparison(label);
    if (!normalized) continue;

    let stat = map.get(normalized);
    if (!stat) {
      stat = {
        tag: label,
        normalized,
        uses: 0,
        people: 0,
        works: 0,
        _people: new Set<string>(),
        _works: new Set<string>(),
      };
      map.set(normalized, stat);
    }

    stat.uses++;

    if (row.visitante_hash) stat._people.add(row.visitante_hash);
    if (row.obra_id) stat._works.add(row.obra_id);

    // Preserva a grafia mais frequente como rótulo visual.
    if (label.length < stat.tag.length && stat.uses === 1) {
      stat.tag = label;
    }
  }

  for (const stat of map.values()) {
    stat.people = stat._people.size;
    stat.works = stat._works.size;
  }

  return map;
}

function computePhi(
  a: Set<string>,
  b: Set<string>,
  universe: Set<string>,
): { phi: number; jaccard: number; cooccurrence: number } {
  let n11 = 0;
  let n10 = 0;
  let n01 = 0;
  let n00 = 0;

  for (const obra of universe) {
    const inA = a.has(obra);
    const inB = b.has(obra);

    if (inA && inB) n11++;
    else if (inA) n10++;
    else if (inB) n01++;
    else n00++;
  }

  const denominator = Math.sqrt(
    (n11 + n10) *
    (n11 + n01) *
    (n00 + n10) *
    (n00 + n01)
  );

  const phi = denominator > 0
    ? (n11 * n00 - n10 * n01) / denominator
    : 0;

  const union = n11 + n10 + n01;
  const jaccard = union > 0 ? n11 / union : 0;

  return {
    phi,
    jaccard,
    cooccurrence: n11,
  };
}

async function loadCachedAnalyses(
  tagNormalized: string,
  obraIds: string[],
): Promise<Map<string, any>> {
  if (obraIds.length === 0) return new Map();

  try {
    const { data, error } = await supabaseAdmin
      .from('image_tag_ml_analysis')
      .select('*')
      .eq('tag_normalizada', tagNormalized)
      .in('obra_id', obraIds);

    if (error) return new Map();

    return new Map((data || []).map((row: any) => [row.obra_id, row]));
  } catch {
    return new Map();
  }
}

function buildContextText(obra: ObraRow): string {
  return [
    obra.titulo,
    obra.artista,
    obra.ano,
    obra.descricao,
    obra.material ? `material: ${obra.material}` : '',
    obra.tecnica ? `técnica: ${obra.tecnica}` : '',
    obra.origem ? `origem: ${obra.origem}` : '',
  ].filter(Boolean).join('. ');
}

async function analyzeOneObra(
  tag: string,
  obra: ObraRow,
  otherTags: string[],
  tagId?: string,
): Promise<any> {
  if (!obra.imagem_url) {
    return {
      obraId: obra.id,
      titulo: obra.titulo,
      imagemUrl: null,
      otherTags,
      error: 'Esta obra não possui imagem cadastrada.',
    };
  }

  try {
    const contextText = buildContextText(obra);
    const candidateTags = Array.from(
      new Set(
        [tag, ...otherTags]
          .map(cleanLabel)
          .filter(Boolean)
      )
    ).slice(0, 12);

    const [vision, embeddingBatch, contextPrediction] = await Promise.all([
      mlClient.analyzeImageTag({
        imageUrl: obra.imagem_url,
        tag,
        context: contextText,
        candidateTags,
      }),
      mlClient.embedBatch([tag, contextText, ...otherTags.slice(0, 8)]),
      mlClient.predictContext(tag, {
        titulo: obra.titulo,
        artista: obra.artista,
        ano: obra.ano,
        descricao: obra.descricao,
        material: obra.material,
        tecnica: obra.tecnica,
        origem: obra.origem,
      }),
    ]);

    if (!vision) {
      throw new Error('O serviço visual não respondeu. Verifique se o ML Service foi atualizado e está online.');
    }

    let contextSimilarity: number | null = null;
    let tagSetCoherence: number | null = null;

    if (embeddingBatch?.embeddings?.length >= 2) {
      const tagEmbedding = embeddingBatch.embeddings[0];
      const contextEmbedding = embeddingBatch.embeddings[1];
      contextSimilarity = toUnitInterval(cosine(tagEmbedding, contextEmbedding));

      if (otherTags.length > 0) {
        const tagSetSims = otherTags
          .slice(0, 8)
          .map((_, index) => cosine(tagEmbedding, embeddingBatch.embeddings[index + 2]))
          .filter((v): v is number => typeof v === 'number');

        if (tagSetSims.length > 0) {
          tagSetCoherence = toUnitInterval(
            tagSetSims.reduce((sum, value) => sum + value, 0) / tagSetSims.length
          );
        }
      }
    }

    const cohesionScore = weightedMean([
      [vision?.visualEvidence ?? null, 0.55],
      [contextSimilarity, 0.30],
      [tagSetCoherence, 0.15],
    ]);

    const modelName = vision?.model || 'google/siglip-base-patch16-224';
    const modelVersion = vision?.modelVersion || modelName;

    const result = {
      obraId: obra.id,
      titulo: obra.titulo,
      imagemUrl: obra.imagem_url,
      cached: false,
      visualEvidence: vision?.visualEvidence ?? null,
      contextSimilarity,
      tagSetCoherence,
      cohesionScore,
      visualConcepts: vision?.visualConcepts || [],
      contextCategory: contextPrediction?.best_category || null,
      contextScore: typeof contextPrediction?.best_score === 'number'
        ? contextPrediction.best_score
        : null,
      contextPredictions: contextPrediction?.predictions || [],
      otherTags,
      model: modelName,
    };

    try {
      await supabaseAdmin
        .from('image_tag_ml_analysis')
        .upsert({
          obra_id: obra.id,
          tag_id: tagId || null,
          tag_original: tag,
          tag_normalizada: normalizeForComparison(tag),
          model_name: modelName,
          model_version: modelVersion,
          visual_evidence: result.visualEvidence,
          context_similarity: contextSimilarity,
          tag_set_coherence: tagSetCoherence,
          cohesion_score: cohesionScore,
          visual_concepts: result.visualConcepts,
          context_evidence: {
            contextText,
            otherTags,
            contextCategory: result.contextCategory,
            contextScore: result.contextScore,
            contextPredictions: result.contextPredictions,
          },
          other_tags: otherTags,
          raw_model_output: vision || {},
          updated_at: new Date().toISOString(),
        }, { onConflict: 'obra_id,tag_normalizada,model_name' });
    } catch {
      // A análise continua útil mesmo se a tabela de cache ainda não tiver sido migrada.
    }

    return result;
  } catch (error) {
    return {
      obraId: obra.id,
      titulo: obra.titulo,
      imagemUrl: obra.imagem_url,
      otherTags,
      error: error instanceof Error ? error.message : 'Falha na análise visual.',
    };
  }
}

export async function GET(req: NextRequest) {
  try {
    const tag = cleanLabel(req.nextUrl.searchParams.get('tag') || '');

    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Informe uma tag.' },
        { status: 400 }
      );
    }

    const rows = await loadAllTagRows();
    const normalizedTag = normalizeForComparison(tag);
    const map = statsMap(rows);
    const current = map.get(normalizedTag) || {
      tag,
      normalized: normalizedTag,
      uses: 0,
      people: 0,
      works: 0,
      _people: new Set<string>(),
      _works: new Set<string>(),
    };

    const tagStats = Array.from(map.values())
      .sort((a, b) => b.people - a.people || b.uses - a.uses || b.works - a.works)
      .slice(0, 120)
      .map(({ _people, _works, ...rest }) => rest);

    const workRows = new Map<string, { tags: Set<string>; labels: Map<string, string> }>();
    const universe = new Set<string>();

    for (const row of rows) {
      if (!row.obra_id) continue;

      universe.add(row.obra_id);

      let entry = workRows.get(row.obra_id);
      if (!entry) {
        entry = { tags: new Set<string>(), labels: new Map<string, string>() };
        workRows.set(row.obra_id, entry);
      }

      const label = cleanLabel(row.tag_original || '');
      const normalized = normalizeForComparison(label);
      if (!normalized) continue;

      entry.tags.add(normalized);
      entry.labels.set(normalized, label);
    }

    const topForMatrix = [...map.values()]
      .sort((a, b) => b.uses - a.uses)
      .slice(0, MAX_MATRIX_TAGS);

    if (!topForMatrix.some(item => item.normalized === normalizedTag)) {
      topForMatrix.pop();
      topForMatrix.push(current);
    }

    const matrixLabels = topForMatrix.map(item => item.tag);
    const matrixValues = topForMatrix.map(a =>
      topForMatrix.map(b => {
        if (a.normalized === b.normalized) return 1;

        const setA = new Set<string>();
        const setB = new Set<string>();

        for (const [obraId, info] of workRows) {
          if (info.tags.has(a.normalized)) setA.add(obraId);
          if (info.tags.has(b.normalized)) setB.add(obraId);
        }

        return computePhi(setA, setB, universe).phi;
      })
    );

    const correlations: Array<any> = [];

    for (let i = 0; i < topForMatrix.length; i++) {
      for (let j = i + 1; j < topForMatrix.length; j++) {
        const a = topForMatrix[i];
        const b = topForMatrix[j];

        const setA = new Set<string>();
        const setB = new Set<string>();

        for (const [obraId, info] of workRows) {
          if (info.tags.has(a.normalized)) setA.add(obraId);
          if (info.tags.has(b.normalized)) setB.add(obraId);
        }

        const result = computePhi(setA, setB, universe);

        if (result.cooccurrence < MIN_PAIR_SUPPORT) continue;

        correlations.push({
          tagA: a.tag,
          tagB: b.tag,
          phi: Math.round(clamp(result.phi) * 1000) / 1000,
          jaccard: Math.round(result.jaccard * 1000) / 1000,
          cooccurrence: result.cooccurrence,
          support: result.cooccurrence,
        });
      }
    }

    correlations.sort((a, b) => Math.abs(b.phi) - Math.abs(a.phi));

    const currentWorkIds = Array.from(workRows.entries())
      .filter(([, info]) => info.tags.has(normalizedTag))
      .map(([obraId]) => obraId);

    const obras = await loadObras(currentWorkIds);

    let cached = new Map<string, any>();
    try {
      cached = await loadCachedAnalyses(normalizedTag, currentWorkIds);
    } catch {}

    const missing: string[] = currentWorkIds.filter(id => !cached.has(id) && !!obras.get(id)?.imagem_url);
    const toInfer = missing.slice(0, MAX_IMAGE_INFERENCES_PER_REQUEST);

    const missingResults = await Promise.all(
      toInfer.map(async (obraId) => {
        const obra = obras.get(obraId)!;
        const info = workRows.get(obraId)!;
        const otherTags = Array.from(info.tags)
          .filter(value => value !== normalizedTag)
          .slice(0, 8)
          .map(value => info.labels.get(value) || value);

        return analyzeOneObra(tag, obra, otherTags);
      })
    );

    for (const result of missingResults) {
      if (result?.obraId) cached.set(result.obraId, result);
    }

    const imageEvidence = currentWorkIds
      .map(id => {
        const row = cached.get(id);
        if (!row) {
          const obra = obras.get(id);
          return obra
            ? {
                obraId: id,
                titulo: obra.titulo,
                imagemUrl: obra.imagem_url,
                cached: false,
                otherTags: Array.from(workRows.get(id)?.tags || [])
                  .filter(value => value !== normalizedTag)
                  .slice(0, 8)
                  .map(value => workRows.get(id)?.labels.get(value) || value),
                error: 'Imagem ainda não analisada pelo modelo. Clique novamente para ampliar a cobertura.',
              }
            : null;
        }

        return {
          obraId: id,
          titulo: row.titulo || obras.get(id)?.titulo || 'Obra',
          imagemUrl: row.imagemUrl || obras.get(id)?.imagem_url || null,
          cached: row.cached ?? true,
          visualEvidence: row.visual_evidence ?? row.visualEvidence ?? null,
          contextSimilarity: row.context_similarity ?? row.contextSimilarity ?? null,
          tagSetCoherence: row.tag_set_coherence ?? row.tagSetCoherence ?? null,
          cohesionScore: row.cohesion_score ?? row.cohesionScore ?? null,
          visualConcepts: row.visual_concepts ?? row.visualConcepts ?? [],
          contextCategory: row.context_evidence?.contextCategory ?? row.contextCategory ?? null,
          contextScore: row.context_evidence?.contextScore ?? row.contextScore ?? null,
          contextPredictions: row.context_evidence?.contextPredictions ?? row.contextPredictions ?? [],
          otherTags: row.other_tags ?? row.otherTags ?? [],
          model: row.model_name || row.model || null,
        };
      })
      .filter(Boolean)
      .slice(0, 12);

    return NextResponse.json({
      success: true,
      data: {
        currentTag: {
          tag: current.tag,
          uses: current.uses,
          people: current.people,
          works: current.works,
        },
        topTags: tagStats,
        correlations: correlations.slice(0, 20),
        correlationMatrix: {
          labels: matrixLabels,
          values: matrixValues,
        },
        imageEvidence,
        worksTotal: currentWorkIds.length,
        worksAnalyzed: imageEvidence.filter(item => !('error' in (item as any))).length,
        visualModel: 'google/siglip-base-patch16-224',
        contextModel: 'answerdotai/ModernBERT-base',
        formula: '55% evidência visual + 30% contexto semântico da obra + 15% coerência com as demais tags. Os componentes ausentes são renormalizados.',
        note: '“Pessoas” = visitantes distintos identificados por visitante_hash, preservando o identificador não exibido na interface. A correlação φ usa presença/ausência das tags por obra; pares são exibidos quando há suporte observado.',
        interpretation: {
          visualEvidence: 'Compatibilidade imagem ↔ descrição da tag pelo modelo vision-language; não é probabilidade calibrada.',
          contextCategory: 'Categoria contextual mais compatível entre material, técnica, autoria, data, geografia, iconografia, tema e conservação.',
          contextScore: 'Similaridade da tag com o contexto textual da obra para a categoria escolhida.',
          tagSetCoherence: 'Similaridade semântica da tag com as outras tags usadas na mesma obra.',
          correlation: 'φ mede associação entre presença das duas tags nas obras; Jaccard informa sobreposição relativa.',
        },
      },
    });
  } catch (error) {
    console.error('[TAG MULTIMODAL] Erro:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : 'Erro desconhecido na análise multimodal.',
      },
      { status: 500 }
    );
  }
}
