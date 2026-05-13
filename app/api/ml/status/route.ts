import { NextRequest, NextResponse } from 'next/server';
import { ML_SERVICE_URL } from '@/lib/core/env';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!ML_SERVICE_URL) {
    return NextResponse.json({
      online: false,
      reason: 'ML_SERVICE_URL not configured',
      motors: {
        tokenClassifier: 'heuristic_fallback',
        knowledgeGraph: 'heuristic_fallback',
        communities: 'heuristic_fallback',
        semanticMemory: 'hash_384d',
        confidence: 'calibrated_multifactor',
        activeLearning: 'active_learning_loop'
      }
    });
  }

  try {
    const res = await fetch(`${ML_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
      cache: 'no-store'
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const health = await res.json();

    return NextResponse.json({
      online: true,
      url: ML_SERVICE_URL,
      device: health.device || 'cpu',
      models: health.models || {},
      motors: {
        tokenClassifier: 'modernbert_ner',
        knowledgeGraph: 'rotate_link_prediction',
        communities: 'gat_clustering',
        semanticMemory: 'pgvector_768d',
        confidence: 'calibrated_multifactor',
        activeLearning: 'active_learning_loop'
      }
    });
  } catch (err: any) {
    return NextResponse.json({
      online: false,
      reason: err.message,
      url: ML_SERVICE_URL,
      motors: {
        tokenClassifier: 'heuristic_fallback',
        knowledgeGraph: 'heuristic_fallback',
        communities: 'heuristic_fallback',
        semanticMemory: 'hash_384d',
        confidence: 'calibrated_multifactor',
        activeLearning: 'active_learning_loop'
      }
    });
  }
}
