import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

async function getRelatorioData() {
  const [tags, nucleos, obras, fontes, validacoes] = await Promise.all([
    supabaseAdmin.from('tags').select('id, tag_original, tag_normalizada, grupo_tematico, status, obra_id, criado_em, obras(titulo)'),
    supabaseAdmin.from('nucleos').select('id, status_validacao, confianca, novidade, tensao'),
    supabaseAdmin.from('obras').select('id, titulo, artista'),
    supabaseAdmin.from('resultados_externos').select('id, fonte, status, match_score'),
    supabaseAdmin.from('validacoes').select('id, decisao, criado_em')
  ]);

  return {
    tags: tags.data || [],
    nucleos: nucleos.data || [],
    obras: obras.data || [],
    fontes: fontes.data || [],
    validacoes: validacoes.data || []
  };
}

export default async function RelatoriosPage() {
  const { tags, nucleos, obras, fontes, validacoes } = await getRelatorioData();

  const tagsPorStatus = tags.reduce((acc: Record<string, number>, t: any) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});

  const tagsPorGrupo = tags.reduce((acc: Record<string, number>, t: any) => {
    const g = t.grupo_tematico || 'Outros';
    acc[g] = (acc[g] || 0) + 1;
    return acc;
  }, {});

  const fontesPorOrigem = fontes.reduce((acc: Record<string, number>, f: any) => {
    acc[f.fonte] = (acc[f.fonte] || 0) + 1;
    return acc;
  }, {});

  const csvContent = [
    ['Contribuição', 'Forma Organizada', 'Obra', 'Campo Temático', 'Estado', 'Data'].join(','),
    ...tags.map((t: any) => [
      `"${t.tag_original}"`, `"${t.tag_normalizada}"`,
      `"${(t as any).obras?.titulo || ''}"`,
      `"${t.grupo_tematico || ''}"`, `"${t.status}"`, `"${t.criado_em}"`
    ].join(','))
  ].join('\n');

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Relatórios e Exportação</h1>
          <p className="text-white/50 mt-2">Análise consolidada dos dados semânticos e documentais.</p>
        </div>

        {/* Summary Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total de contribuições', value: tags.length },
            { label: 'Registros processados', value: nucleos.length },
            { label: 'Conexões externas', value: fontes.length },
            { label: 'Validações realizadas', value: validacoes.length }
          ].map(({ label, value }) => (
            <div key={label} className="glass-card p-5 text-center">
              <div className="text-3xl font-bold text-blue-300">{value}</div>
              <div className="text-white/40 text-xs mt-1 uppercase tracking-wider leading-tight">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Status */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Contribuições por estado</h3>
            {Object.entries(tagsPorStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm capitalize">{status}</span>
                <span className="text-blue-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Grupos temáticos */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Campos temáticos</h3>
            {Object.entries(tagsPorGrupo).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([grupo, count]) => (
              <div key={grupo} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm">{grupo}</span>
                <span className="text-purple-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* Fontes externas */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Conexões por fonte externa</h3>
            {Object.keys(fontesPorOrigem).length === 0 ? (
              <p className="text-white/30 text-sm">Nenhuma conexão externa ainda.</p>
            ) : Object.entries(fontesPorOrigem).map(([fonte, count]) => (
              <div key={fonte} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-white/70 text-sm">{fonte}</span>
                <span className="text-green-300 font-bold">{count as number}</span>
              </div>
            ))}
          </div>

          {/* ML indicators avg */}
          <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white mb-4">Indicadores semânticos médios</h3>
            {nucleos.length > 0 ? (() => {
              const avg = (key: string) => Math.round(nucleos.reduce((s, n: any) => s + (n[key] || 0), 0) / nucleos.length);
              return [
                { label: 'Nível de conexão', val: avg('confianca'), color: 'bg-blue-400' },
                { label: 'Novidade semântica', val: avg('novidade'), color: 'bg-purple-400' },
                { label: 'Tensão documental', val: avg('tensao'), color: 'bg-amber-400' }
              ].map(({ label, val, color }) => (
                <div key={label} className="py-2 border-b border-white/5 last:border-0">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-white/70">{label}</span>
                    <span className="text-white/80 font-bold">{val}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div className={`h-full rounded-full ${color}`} style={{ width: `${val}%` }} />
                  </div>
                </div>
              ));
            })() : <p className="text-white/30 text-sm">Dados insuficientes.</p>}
          </div>
        </div>

        {/* Export */}
        <div className="glass-card p-8 text-center space-y-4">
          <h3 className="text-xl font-bold text-white mb-2">Exportar dados</h3>
          <p className="text-white/50 text-sm">Baixe os dados para análise externa ou integração institucional.</p>
          <div className="flex flex-wrap justify-center gap-4 mt-4">
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`}
              download="folksonomia_contribuicoes.csv"
              className="liquid-button px-6 py-3 text-sm"
            >
              Exportar CSV
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
