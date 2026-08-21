import { orchestrator } from '@/lib/ml/IntelligenceOrchestrator';
import { NextRequest, NextResponse } from 'next/server';
import { CULTURAL_VAULT_REGISTRY, ConceptVaultItem } from './registry';

export { CULTURAL_VAULT_REGISTRY };
export type { ConceptVaultItem } from './registry';

export const dynamic = 'force-dynamic';

function isValidCulturalTag(label?: string): boolean {
  if (!label || typeof label !== 'string') return false;
  const clean = label.trim().toLowerCase();
  if (clean.length < 3) return false;
  const noise = /(^|\s)(oi|eu|m|o|test|teste|asdf|foo|bar|baz|null|undefined)(\s|$)|test|teste|asdf|lorem|ipsum/i;
  if (noise.test(clean)) return false;
  if (/^[0-9]+$/.test(clean)) return false;
  return true;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tagParam = searchParams.get('tag');

    if (tagParam) {
      if (!isValidCulturalTag(tagParam)) {
        return NextResponse.json({ success: false, error: 'Tag indisponível para exibição pública.' }, { status: 404 });
      }
      const networkView = await orchestrator.getNetworkView(tagParam);
      return NextResponse.json({ success: true, data: networkView });
    }

    // Retornar uma visão geral ou as tags mais populares se nenhum parâmetro for fornecido
    const generalView = await orchestrator.getNetworkView('geral');
    return NextResponse.json({ success: true, data: generalView });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sourceTag } = body;

    if (!isValidCulturalTag(sourceTag)) {
      return NextResponse.json({ success: false, error: 'A tag fornecida não é válida para processamento.' }, { status: 400 });
    }

    const updatedNode = await orchestrator.processAndEnrichTag(sourceTag);
    const network = await orchestrator.getNetworkView(sourceTag);

    return NextResponse.json({
      success: true,
      data: {
        message: `Tag "${sourceTag}" processada e enriquecida com sucesso.`,
        node: updatedNode,
        dossier: updatedNode,
        nodes: network.nodes,
        connections: network.connections,
        totalNodes: network.total,
        totalConnections: network.totalConnections
      }
    });

  } catch (error: any) {
    console.error(`[LiveVault POST] Erro ao processar a tag: ${error.message}`);
    return NextResponse.json({ success: false, error: `Falha ao processar a tag: ${error.message}` }, { status: 500 });
  }
}