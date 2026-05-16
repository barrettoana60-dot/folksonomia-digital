import { supabaseAdmin } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

async function getFontes() {
  const fontesPadrao = [
    {
      nome: 'Museu de Arte Religiosa e Tradicional (MART)',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo focado em arte sacra, cultura popular e tradições da Região dos Lagos.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'https://museudeartereligiosaetradicional.acervos.museus.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu Regional de Caeté',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo com foco em cultura popular, tradições locais, saberes e fazeres.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'https://museuregionaldecaete.acervos.museus.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu de Arqueologia de Itaipu',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo focado em cultura popular, território e arqueologia.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'http://museudearqueologiadeitaipu.museus.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu da Abolição',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo sobre memória afro-brasileira, escravidão e resistência.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'https://museudaabolicao.acervos.museus.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu do Diamante',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo focado em cultura material, mineração e técnicas.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'http://museudodiamante.acervos.museus.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu do Índio',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo focado em cultura indígena, etnografia e artesanato.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'https://tainacan.museudoindio.gov.br',
      ativo: true,
    },
    {
      nome: 'Museu da Pessoa',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo de histórias de vida, memória e depoimentos.',
      licenca: 'Creative Commons',
      url: 'https://acervo.museudapessoa.org',
      ativo: true,
    },
    {
      nome: 'Museu de Folclore Edison Carneiro',
      tipo: 'Tainacan / json-flat',
      descricao: 'Acervo do Centro Nacional de Folclore e Cultura Popular.',
      licenca: 'Domínio Público / Creative Commons',
      url: 'http://acervo.cnfcp.gov.br',
      ativo: true,
    }
  ];

  for (const fonte of fontesPadrao) {
    await supabaseAdmin
      .from('fontes_externas')
      .upsert(fonte, { onConflict: 'url' })
      .select();
  }

  const { data } = await supabaseAdmin
    .from('fontes_externas')
    .select('*')
    .order('nome');
  return data || [];
}

export default async function FontesPage() {
  const fontes = await getFontes();

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-white">Fontes de Dados Abertos</h1>
          <p className="text-white/50 mt-2">
            Repositórios externos conectados ao motor semântico para enriquecer as células informacionais.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fontes.map((fonte: any) => (
            <div key={fonte.id} className="glass-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">{fonte.nome}</h3>
                  {fonte.tipo && (
                    <span className="text-xs text-blue-300/70">{fonte.tipo}</span>
                  )}
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${
                  fonte.ativo
                    ? 'bg-green-500/20 border-green-500/40 text-green-300'
                    : 'bg-red-500/20 border-red-500/40 text-red-300'
                }`}>
                  {fonte.ativo ? 'Ativa' : 'Inativa'}
                </div>
              </div>

              {fonte.descricao && (
                <p className="text-white/50 text-sm leading-relaxed">{fonte.descricao}</p>
              )}

              <div className="space-y-1 text-xs">
                {fonte.licenca && (
                  <p className="text-white/30">Licença: <span className="text-white/60">{fonte.licenca}</span></p>
                )}
                {fonte.url && (
                  <a href={fonte.url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-400/70 hover:text-blue-300 transition-colors block truncate">
                    {fonte.url}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 mt-10">
          <p className="text-white/40 text-sm leading-relaxed text-center">
            A cada contribuição recebida, o motor semântico consulta automaticamente as fontes ativas 
            para identificar registros similares e enriquecer as células informacionais com metadados externos.
          </p>
        </div>
      </div>
    </main>
  );
}
