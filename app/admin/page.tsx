import { supabaseAdmin } from '@/lib/supabase/client';
import Link from 'next/link';
import { BookOpen, Tag, CheckCircle, Database, Activity, BarChart3 } from 'lucide-react';

export const revalidate = 30;

async function getStats() {
  const [obras, tags, nucleos, eventos, fontes] = await Promise.all([
    supabaseAdmin.from('obras').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('tags').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('nucleos').select('id, status_validacao'),
    supabaseAdmin.from('eventos').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('fontes_externas').select('id', { count: 'exact', head: true })
  ]);

  const allNucleos = nucleos.data || [];
  return {
    obras: obras.count || 0,
    tags: tags.count || 0,
    emAnalise: allNucleos.filter(n => n.status_validacao === 'bruto').length,
    validados: allNucleos.filter(n => n.status_validacao === 'validado' || n.status_validacao === 'publicado').length,
    eventos: eventos.count || 0,
    fontes: fontes.count || 0
  };
}

export default async function AdminPage() {
  const stats = await getStats();

  const metrics = [
    { label: 'Obras no Acervo', value: stats.obras, icon: BookOpen, color: 'text-blue-300', bg: 'bg-blue-500/10' },
    { label: 'Contribuições', value: stats.tags, icon: Tag, color: 'text-purple-300', bg: 'bg-purple-500/10' },
    { label: 'Aguardando Validação', value: stats.emAnalise, icon: Activity, color: 'text-amber-300', bg: 'bg-amber-500/10' },
    { label: 'Registros Validados', value: stats.validados, icon: CheckCircle, color: 'text-green-300', bg: 'bg-green-500/10' },
    { label: 'Fontes Conectadas', value: stats.fontes, icon: Database, color: 'text-cyan-300', bg: 'bg-cyan-500/10' },
    { label: 'Eventos Registrados', value: stats.eventos, icon: BarChart3, color: 'text-pink-300', bg: 'bg-pink-500/10' }
  ];

  const adminLinks = [
    { href: '/admin/obras', label: 'Gestão de Obras', desc: 'Cadastrar, editar e publicar obras do acervo.' },
    { href: '/admin/tags', label: 'Contribuições & Células', desc: 'Visualizar todas as percepções e os núcleos informacionais gerados.' },
    { href: '/admin/validacao', label: 'Painel de Validação', desc: 'Validar, revisar ou rejeitar contribuições pendentes.' },
    { href: '/admin/ontologias', label: 'Ontologias', desc: 'Gerenciar vocabulários e grupos temáticos.' },
    { href: '/admin/fontes', label: 'Fontes Open Data', desc: 'Configurar conexões com Europeana, IBRAM, Brasiliana e outros.' },
    { href: '/admin/eventos', label: 'Trilha de Eventos', desc: 'Histórico criptografado de todas as ações do sistema.' },
    { href: '/admin/relatorios', label: 'Relatórios', desc: 'Exportar dados, conexões e análises semânticas.' }
  ];

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white">Painel Administrativo</h1>
          <p className="text-white/50 mt-2">Visão geral do Sistema Folksonomia Digital</p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {metrics.map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card p-5 text-center">
              <div className={`inline-flex items-center justify-center p-3 rounded-full ${bg} mb-3`}>
                <Icon size={20} className={color} />
              </div>
              <div className={`text-3xl font-bold ${color}`}>{value}</div>
              <div className="text-white/40 text-xs mt-1 uppercase tracking-wider leading-tight">{label}</div>
            </div>
          ))}
        </div>

        {/* Nav Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminLinks.map(({ href, label, desc }) => (
            <Link key={href} href={href} className="glass-card p-6 hover:bg-white/10 group">
              <h3 className="text-lg font-bold text-white group-hover:text-blue-200 transition-colors">{label}</h3>
              <p className="text-white/50 text-sm mt-2 leading-relaxed">{desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
