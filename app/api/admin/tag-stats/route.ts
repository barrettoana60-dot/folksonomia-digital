import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createHash } from 'crypto';
import { detectSpellingErrors } from '@/lib/ml/tag-correlator';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Gera código único determinístico para a tag: TAG-XXXXXXXX
function tagMetaCode(tagNorm: string): string {
  const hash = createHash('sha256').update(tagNorm.trim().toLowerCase()).digest('hex');
  return `TAG-${hash.slice(0, 8).toUpperCase()}`;
}

// Score de correlação de Jaccard entre dois conjuntos de IDs de obras
function jaccard(setA: Set<string>, setB: Set<string>): number {
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  if (union.size === 0) return 0;
  return intersection.size / union.size;
}

export async function GET() {
  try {
    const { data: tagsData, error } = await supabaseAdmin
      .from('tags')
      .select('id, tag_original, tag_normalizada, obra_id, visitante_hash, grupo_tematico, nucleo_id, criado_em')
      .limit(1000);

    if (error || !tagsData) {
      return NextResponse.json({ success: false, error: error?.message || 'Erro ao buscar tags' }, { status: 500 });
    }

    const { data: obrasData } = await supabaseAdmin
      .from('obras')
      .select('id, titulo, imagem_url, artista');

    const obrasMap = new Map<string, { titulo: string; imagem_url: string; artista: string }>();
    for (const o of (obrasData || [])) {
      obrasMap.set(o.id, { titulo: o.titulo || '', imagem_url: o.imagem_url || '', artista: o.artista || '' });
    }

    // Agregação por tag_normalizada
    const tagMap = new Map<string, {
      tag_original: string;
      tag_normalizada: string;
      grupo_tematico: string;
      frequencia: number;
      pessoas: Set<string>;
      obras: Set<string>;
      primeiroCriado: string;
    }>();

    for (const t of tagsData) {
      const norm = (t.tag_normalizada || t.tag_original || '').toLowerCase().trim();
      if (!norm) continue;

      if (!tagMap.has(norm)) {
        tagMap.set(norm, {
          tag_original: t.tag_original,
          tag_normalizada: norm,
          grupo_tematico: t.grupo_tematico || 'Outros',
          frequencia: 0,
          pessoas: new Set(),
          obras: new Set(),
          primeiroCriado: t.criado_em || '',
        });
      }

      const entry = tagMap.get(norm)!;
      entry.frequencia += 1;
      if (t.visitante_hash) entry.pessoas.add(t.visitante_hash);
      if (t.obra_id) entry.obras.add(t.obra_id);
    }

    const tags = [...tagMap.entries()]
      .map(([norm, entry]) => ({
        tag_normalizada: norm,
        tag_original: entry.tag_original,
        grupo_tematico: entry.grupo_tematico,
        frequencia: entry.frequencia,
        pessoas: entry.pessoas.size,
        obras: entry.obras.size,
        obras_ids: [...entry.obras],
        codigo: tagMetaCode(norm),
        primeiroCriado: entry.primeiroCriado,
      }))
      .sort((a, b) => b.frequencia - a.frequencia);

    // Correlações via Jaccard (apenas tags com freq >= 2)
    const tagList = [...tagMap.entries()]
      .filter(([, e]) => e.frequencia >= 2)
      .map(([norm, e]) => ({ norm, obras: e.obras }));

    const correlacoes: { tagA: string; tagB: string; score: number; intersecao: number; obras_compartilhadas: string[] }[] = [];

    for (let i = 0; i < tagList.length; i++) {
      for (let j = i + 1; j < tagList.length; j++) {
        const a = tagList[i];
        const b = tagList[j];
        const score = jaccard(a.obras, b.obras);
        if (score > 0) {
          const compartilhadas = [...a.obras].filter(x => b.obras.has(x));
          correlacoes.push({
            tagA: a.norm,
            tagB: b.norm,
            score: Math.round(score * 1000) / 1000,
            intersecao: compartilhadas.length,
            obras_compartilhadas: compartilhadas,
          });
        }
      }
    }

    const topCorrelacoes = correlacoes
      .sort((a, b) => b.score - a.score)
      .slice(0, 30);

    // Distribuição por obra
    const obraMap = new Map<string, { tags: Set<string>; frequencia: number; pessoas: Set<string> }>();
    for (const t of tagsData) {
      if (!t.obra_id) continue;
      if (!obraMap.has(t.obra_id)) {
        obraMap.set(t.obra_id, { tags: new Set(), frequencia: 0, pessoas: new Set() });
      }
      const entry = obraMap.get(t.obra_id)!;
      const norm = (t.tag_normalizada || t.tag_original || '').toLowerCase().trim();
      if (norm) entry.tags.add(norm);
      entry.frequencia += 1;
      if (t.visitante_hash) entry.pessoas.add(t.visitante_hash);
    }

    const obras = [...obraMap.entries()].map(([id, e]) => {
      const obra = obrasMap.get(id);
      return {
        obra_id: id,
        titulo: obra?.titulo || id.slice(0, 8),
        artista: obra?.artista || '',
        imagem_url: obra?.imagem_url || '',
        tags_distintas: e.tags.size,
        frequencia_total: e.frequencia,
        pessoas: e.pessoas.size,
        tags: [...e.tags].sort(),
      };
    }).sort((a, b) => b.frequencia_total - a.frequencia_total);

    const allNormTags = tags.map(t => t.tag_normalizada);
    let totalErrosOrtograficos = 0;

    const tagsComAnalise = tags.map(t => {
      const spelling = detectSpellingErrors(t.tag_normalizada, allNormTags);
      const erro = spelling.length > 0 && spelling[0].distance > 0 ? {
        detectado: true,
        sugestao_canonica: spelling[0].correctedTo,
        similaridade: Math.round(spelling[0].confidence * 100),
        distancia: spelling[0].distance,
      } : null;

      if (erro) totalErrosOrtograficos++;

      return {
        ...t,
        erro_ortografico: erro,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        tags: tagsComAnalise,
        correlacoes: topCorrelacoes,
        obras,
        resumo: {
          total_registros: tagsData.length,
          tags_distintas: tags.length,
          total_erros_ortograficos: totalErrosOrtograficos,
          obras_com_tags: obras.length,
          pares_correlatos: topCorrelacoes.length,
          tag_mais_frequente: tags[0]?.tag_original || '',
          tag_mais_pessoas: [...tags].sort((a, b) => b.pessoas - a.pessoas)[0]?.tag_original || '',
        },
      },
    });

  } catch (err: any) {
    console.error('Erro em tag-stats:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
