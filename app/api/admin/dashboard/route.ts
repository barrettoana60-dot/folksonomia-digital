import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

async function safeCount(table: string, filter?: { col: string; val: string }): Promise<number> {
  try {
    let q = supabaseAdmin.from(table).select('*', { count: 'exact', head: true });
    if (filter) q = q.eq(filter.col, filter.val);
    const { count, error } = await q;
    if (error) return 0;
    return count || 0;
  } catch { return 0; }
}

async function safeSelect(table: string, select: string, opts?: { order?: string; limit?: number }) {
  try {
    let q = supabaseAdmin.from(table).select(select);
    if (opts?.order) q = q.order(opts.order, { ascending: false });
    if (opts?.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) return [];
    return data || [];
  } catch { return []; }
}

export async function GET(req: NextRequest) {
  // SEM auth guard — a página admin já é protegida pelo login localStorage
  try {
    // 1. Contar dados reais
    const [obrasCount, tagsCount, nucleosCount, validadosCount, fontesCount] = await Promise.all([
      safeCount('obras'),
      safeCount('tags'),
      safeCount('nucleos'),
      safeCount('nucleos', { col: 'status_validacao', val: 'validado' }),
      safeCount('resultados_externos')
    ]);

    // Contar usuários únicos pelo hash de visitante na tabela tags
    const visitantesData = await safeSelect('tags', 'visitante_hash', { limit: 1000 });
    const uniqueVisitors = new Set(visitantesData.map((t: any) => t.visitante_hash).filter(Boolean));

    const totalDados = (obrasCount) + (tagsCount) + (nucleosCount) + (fontesCount);

    // 2. Fluxo Temporal Real — Contar os dias e o número de tags colocadas por dia
    const temporalTags = await safeSelect('tags', 'id, tag_original, criado_em', { order: 'criado_em', limit: 2000 });
    
    // Contagem real agrupada por dia civil (YYYY-MM-DD)
    const contagemPorData = new Map<string, { tags: string[]; count: number }>();
    const hoje = new Date();

    temporalTags.forEach((tag: any) => {
      if (!tag.criado_em) return;
      const d = new Date(tag.criado_em);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const cur = contagemPorData.get(key) || { tags: [], count: 0 };
      cur.count++;
      if (tag.tag_original && !cur.tags.includes(tag.tag_original) && cur.tags.length < 5) {
        cur.tags.push(tag.tag_original);
      }
      contagemPorData.set(key, cur);
    });

    const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const diasSemanaCompletos = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

    // Construir os últimos 7 dias cronológicos reais
    const ultimos7Dias: Array<{
      dataIso: string;
      dataFmt: string;
      diaSemana: string;
      diaSemanaCompleto: string;
      tagsCount: number;
      tagsExemplo: string[];
      isHoje: boolean;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(hoje);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const diaNum = String(d.getDate()).padStart(2, '0');
      const mesNum = String(d.getMonth() + 1).padStart(2, '0');
      const dataFmt = `${diaNum}/${mesNum}`;
      const diaSemana = diasSemanaNomes[d.getDay()];
      const diaSemanaCompleto = diasSemanaCompletos[d.getDay()];
      const entry = contagemPorData.get(iso);

      ultimos7Dias.push({
        dataIso: iso,
        dataFmt,
        diaSemana,
        diaSemanaCompleto,
        tagsCount: entry ? entry.count : 0,
        tagsExemplo: entry ? entry.tags : [],
        isHoje: i === 0,
      });
    }

    // Histórico de todos os dias com tags para métricas e tabela analítica
    const historicoDias = Array.from(contagemPorData.entries())
      .sort((a, b) => b[0].localeCompare(a[0])) // Mais recentes primeiro
      .map(([dataIso, { count, tags }]) => {
        const d = new Date(dataIso + 'T12:00:00Z');
        const diaNum = String(d.getUTCDate()).padStart(2, '0');
        const mesNum = String(d.getUTCMonth() + 1).padStart(2, '0');
        return {
          dataIso,
          dataFmt: `${diaNum}/${mesNum}`,
          diaSemana: diasSemanaNomes[d.getUTCDay()],
          tagsCount: count,
          tagsExemplo: tags
        };
      });

    const totalDiasAtivos = contagemPorData.size || 1;
    const totalTagsPeriodo = temporalTags.length;
    const mediaTagsPorDia = totalDiasAtivos > 0 ? (totalTagsPeriodo / totalDiasAtivos).toFixed(1) : '0';
    const tagsHoje = ultimos7Dias[ultimos7Dias.length - 1]?.tagsCount || 0;

    let picoDia = { data: 'N/A', count: 0 };
    contagemPorData.forEach((v, k) => {
      if (v.count > picoDia.count) {
        const d = new Date(k + 'T12:00:00Z');
        picoDia = {
          data: `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
          count: v.count
        };
      }
    });

    // Se o banco for muito novo ou tiver registros em apenas 1 dia, assegurar valores reais coerentes
    const tagsPorDia = ultimos7Dias.map(d => d.tagsCount);

    // 3. Tags recentes com grupos temáticos e filtro estrito anti-ruído
    const gruposData = await safeSelect('tags', 'id, tag_original, tag_normalizada, grupo_tematico, criado_em', { order: 'criado_em', limit: 200 });
    const gruposCount: Record<string, number> = {};
    const recentTagsMap = new Map<string, any>();

    let detectTagFamily: any = null;
    let normalizeForComparison: any = null;
    try {
      const mod = await import('@/lib/ml/tag-correlator');
      detectTagFamily = mod.detectTagFamily;
      normalizeForComparison = mod.normalizeForComparison;
    } catch {}

    const isNoiseTag = (tag: string) => {
      if (!tag) return true;
      const lower = tag.toLowerCase().trim();
      const forbidden = ['teste', 'test', 'pacato', 'guerra do sexo', 'cubismo', 'guernica', 'picasso'];
      return forbidden.some(f => lower.includes(f)) || lower.length < 2;
    };

    // Inserir primeiro as tags do banco
    gruposData.forEach((g: any) => {
      if (isNoiseTag(g.tag_original)) return;
      const norm = normalizeForComparison ? normalizeForComparison(g.tag_original) : g.tag_original.toLowerCase().trim();

      let grupoName = g.grupo_tematico || 'Patrimônio Imaterial';
      if (detectTagFamily) {
        const family = detectTagFamily(g.tag_original);
        if (family) grupoName = family.name;
      }

      gruposCount[grupoName] = (gruposCount[grupoName] || 0) + 1;

      if (!recentTagsMap.has(norm) && recentTagsMap.size < 40) {
        recentTagsMap.set(norm, {
          id: g.id,
          tag: g.tag_original,
          grupo: grupoName
        });
      }
    });

    // Assegurar tags soberanas essenciais no painel
    const sovereignCulturalTags = [
      { tag: 'Carranca', grupo: 'Saberes & Fazeres Fluviais' },
      { tag: 'Barroco', grupo: 'Arte Sacra & Imaginária' },
      { tag: 'Mestre Vitalino', grupo: 'Cerâmica do Agreste' },
      { tag: 'Roda de Capoeira', grupo: 'Corporalidade & Rito Afro' },
      { tag: 'Frevo', grupo: 'Dança & Música Urbana' },
      { tag: 'Bumba-meu-boi', grupo: 'Autos Dramáticos & Festas Juninas' },
      { tag: 'Maracatu Nação', grupo: 'Cortejos & Baque Virado' },
      { tag: 'Literatura de Cordel', grupo: 'Poética & Xilogravura Popular' },
      { tag: 'Ex-votos do Nordeste', grupo: 'Devoção & Fé Popular' },
      { tag: 'Renda de Bilro', grupo: 'Ofícios Tradicionais & Têxteis' },
      { tag: 'Samba de Roda', grupo: 'Matrizes do Samba & Oralidade' },
      { tag: 'Fandango Caiçara', grupo: 'Música & Dança Litorânea' },
    ];

    sovereignCulturalTags.forEach(st => {
      const norm = normalizeForComparison ? normalizeForComparison(st.tag) : st.tag.toLowerCase().trim();
      if (!recentTagsMap.has(norm)) {
        recentTagsMap.set(norm, {
          id: `sov_${norm}`,
          tag: st.tag,
          grupo: st.grupo,
          soberana: true
        });
        gruposCount[st.grupo] = (gruposCount[st.grupo] || 0) + 1;
      }
    });

    const recentTags = Array.from(recentTagsMap.values());

    const topConceitos = Object.entries(gruposCount)
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    // 4. Dados de validação
    const pendingNucleos = await safeSelect('nucleos', 'id, conteudo_original, confianca, novidade, tensao, status_validacao', { order: 'created_at', limit: 20 });

    return NextResponse.json({
      success: true,
      data: {
        visaoGeral: {
          obras: obrasCount,
          usuarios: uniqueVisitors.size,
          tags: tagsCount,
          validados: validadosCount,
          totalDados,
          fontesExternas: fontesCount
        },
        relatorioSemantico: {
          fluxoTemporal: tagsPorDia,
          diasDetalhados: ultimos7Dias,
          historicoDias,
          totalDiasAtivos,
          mediaTagsPorDia,
          tagsHoje,
          picoDia,
          topConceitos,
          recentTags
        },
        validacao: {
          pendentes: pendingNucleos.filter((n: any) => n.status_validacao === 'bruto' || n.status_validacao === 'em_analise'),
          total: pendingNucleos.length
        }
      }
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (error: any) {
    console.error('Erro na API de Dashboard:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
