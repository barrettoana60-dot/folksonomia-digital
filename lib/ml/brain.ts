/**
 * Folksonomia Digital 2.0 — Módulo Cérebro
 * 
 * Núcleo central de inteligência. Responsável por:
 * 1. RASTREAR: De onde veio cada dado, por onde passou, para onde vai
 * 2. APRENDER: Persistir cada conexão descoberta no banco
 * 3. PROPAGAR: Quando tag A conecta com B, e B com C → inferir A↔C
 * 4. IDENTIFICAR: Padrões recorrentes entre tags (DNA semântico)
 * 5. BALANCEAR: Calcular pesos de confiança baseado em evidências acumuladas
 */

import { supabaseAdmin } from '@/lib/supabase/client';
import { normalizeForComparison, analyzeTagCorrelations, detectTagFamily, findFamilyMembers } from './tag-correlator';

// ============================================================
// Tipos do Cérebro
// ============================================================

export interface NeuralTrace {
  id: string;
  timestamp: string;
  action: 'INGESTAO' | 'CORRELACAO' | 'PROPAGACAO' | 'APRENDIZADO' | 'VALIDACAO' | 'CONEXAO';
  origin: string;           // De onde veio (ex: 'europeana', 'curador', 'ml-engine')
  destination: string;      // Para onde vai (ex: 'tag:cubismo', 'familia:vanguardas')
  payload: Record<string, any>;
  confidence: number;       // 0-1
}

export interface NeuralConnection {
  tagA: string;
  tagB: string;
  connectionType: 'duplicate' | 'spelling' | 'synonym' | 'family' | 'cross_source' | 'propagated' | 'co_occurrence';
  strength: number;         // 0-1, cresce com evidências
  evidence: string[];       // Lista de razões
  traces: string[];         // IDs de traces que geraram esta conexão
  createdAt: string;
  updatedAt: string;
}

export interface BrainState {
  tag: string;
  totalConnections: number;
  totalTraces: number;
  neuralMap: NeuralConnection[];
  traces: NeuralTrace[];
  propagatedInsights: string[];
  dnaSignature: Record<string, number>; // DNA semântico: {period: 0.8, technique: 0.3, ...}
}

// ============================================================
// Rastreamento Neural — Registra o tráfego de informação
// ============================================================

function createTrace(
  action: NeuralTrace['action'],
  origin: string,
  destination: string,
  payload: Record<string, any>,
  confidence: number
): NeuralTrace {
  return {
    id: `trace-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    action,
    origin,
    destination,
    payload,
    confidence
  };
}

// ============================================================
// Persistência de Conexões Neurais
// ============================================================

async function persistNeuralConnection(conn: NeuralConnection) {
  try {
    // Usar tag_families para persistir conexões bidirecionais
    const canonical = [conn.tagA, conn.tagB].sort().join('↔');
    
    await supabaseAdmin
      .from('tag_families')
      .upsert({
        canonical_tag: canonical,
        family_name: conn.connectionType,
        family_type: conn.connectionType,
        members: [{
          tagA: conn.tagA,
          tagB: conn.tagB,
          strength: conn.strength,
          evidence: conn.evidence,
          type: conn.connectionType
        }],
        updated_at: new Date().toISOString()
      }, { onConflict: 'canonical_tag' });
  } catch (err) {
    // Tabelas podem não existir ainda
    console.warn('[Brain] Persist connection failed:', err);
  }
}

async function persistTrace(trace: NeuralTrace, tagNormalized: string) {
  try {
    await supabaseAdmin
      .from('tag_learning_history')
      .insert({
        tag_normalizada: tagNormalized,
        event_type: trace.action.toLowerCase(),
        event_details: {
          trace_id: trace.id,
          origin: trace.origin,
          destination: trace.destination,
          confidence: trace.confidence,
          payload: trace.payload,
          timestamp: trace.timestamp
        }
      });
  } catch {
    // Silent fail
  }
}

// ============================================================
// Propagação de Conhecimento (A→B + B→C = A↔C)
// ============================================================

function propagateConnections(
  directConnections: NeuralConnection[],
  allTags: string[]
): { propagated: NeuralConnection[]; insights: string[] } {
  const propagated: NeuralConnection[] = [];
  const insights: string[] = [];
  const seen = new Set<string>();

  for (const connAB of directConnections) {
    for (const connBC of directConnections) {
      // Se A→B e B→C existem, inferir A→C
      if (connAB.tagB === connBC.tagA && connAB.tagA !== connBC.tagB) {
        const key = [connAB.tagA, connBC.tagB].sort().join('↔');
        if (seen.has(key)) continue;
        seen.add(key);

        const propagatedStrength = Math.min(connAB.strength, connBC.strength) * 0.7;
        
        if (propagatedStrength > 0.3) {
          propagated.push({
            tagA: connAB.tagA,
            tagB: connBC.tagB,
            connectionType: 'propagated',
            strength: propagatedStrength,
            evidence: [
              `Inferido via cadeia: "${connAB.tagA}" → "${connAB.tagB}" → "${connBC.tagB}"`,
              `Caminho: ${connAB.connectionType} + ${connBC.connectionType}`
            ],
            traces: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });

          insights.push(
            `Conexão propagada: "${connAB.tagA}" se liga a "${connBC.tagB}" porque ambas se conectam com "${connAB.tagB}" (confiança: ${Math.round(propagatedStrength * 100)}%)`
          );
        }
      }
    }
  }

  return { propagated, insights };
}

// ============================================================
// DNA Semântico — Assinatura temática da tag
// ============================================================

function calculateDNA(
  tag: string,
  connections: NeuralConnection[],
  family: any | null
): Record<string, number> {
  const dna: Record<string, number> = {
    period: 0,
    technique: 0,
    geography: 0,
    material: 0,
    theme: 0,
    provenance: 0,
    movement: 0
  };

  // Contribuição da família
  if (family) {
    dna[family.type] = (dna[family.type] || 0) + 0.8;
  }

  // Contribuição das conexões
  for (const conn of connections) {
    if (conn.connectionType === 'family') dna.movement += 0.3;
    if (conn.connectionType === 'synonym') dna.theme += 0.2;
    if (conn.connectionType === 'co_occurrence') dna.theme += 0.1;
  }

  // Normalizar para 0-1
  const maxVal = Math.max(...Object.values(dna), 0.01);
  for (const key of Object.keys(dna)) {
    dna[key] = Math.round((dna[key] / maxVal) * 100) / 100;
  }

  return dna;
}

// ============================================================
// Carregar conexões existentes do banco
// ============================================================

async function loadExistingConnections(tagNormalized: string): Promise<any[]> {
  try {
    const { data } = await supabaseAdmin
      .from('tag_families')
      .select('*')
      .or(`canonical_tag.ilike.%${tagNormalized}%`)
      .limit(50);
    return data || [];
  } catch {
    return [];
  }
}

async function loadLearningTraces(tagNormalized: string): Promise<any[]> {
  try {
    const { data } = await supabaseAdmin
      .from('tag_learning_history')
      .select('*')
      .eq('tag_normalizada', tagNormalized)
      .order('created_at', { ascending: false })
      .limit(30);
    return data || [];
  } catch {
    return [];
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL: Análise Cerebral Completa
// ============================================================

export async function runBrainAnalysis(
  tag: string,
  allTags: string[]
): Promise<BrainState> {
  const normalized = normalizeForComparison(tag);
  const traces: NeuralTrace[] = [];
  const connections: NeuralConnection[] = [];

  // TRACE: Início da análise
  traces.push(createTrace('INGESTAO', 'curador', `tag:${tag}`, { action: 'analysis_requested', totalTagsInDb: allTags.length }, 1.0));

  // ================================================================
  // PASSO 1: Análise ML local (erros, sinônimos, famílias)
  // ================================================================
  const mlAnalysis = analyzeTagCorrelations(tag, allTags);
  const family = detectTagFamily(tag);
  const familyMembers = findFamilyMembers(tag, allTags);

  traces.push(createTrace('CORRELACAO', 'ml-engine', `tag:${tag}`, {
    duplicates: mlAnalysis.duplicates.length,
    siblings: mlAnalysis.siblings.length,
    family: family?.name || null,
    familyMembers: familyMembers.length,
    spellingErrors: mlAnalysis.spellingErrors.length
  }, 0.95));

  // Converter duplicatas em conexões neurais
  for (const dup of mlAnalysis.duplicates) {
    connections.push({
      tagA: tag,
      tagB: dup.tag,
      connectionType: dup.relation === 'spelling_error' ? 'spelling' : 'duplicate',
      strength: dup.score,
      evidence: [dup.reason],
      traces: [traces[traces.length - 1].id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Converter siblings em conexões
  for (const sib of mlAnalysis.siblings) {
    connections.push({
      tagA: tag,
      tagB: sib.tag,
      connectionType: sib.relation === 'synonym' ? 'synonym' : 'family',
      strength: sib.score,
      evidence: [sib.reason],
      traces: [traces[traces.length - 1].id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  // Converter membros de família em conexões
  for (const member of familyMembers) {
    if (!connections.some(c => c.tagB === member)) {
      connections.push({
        tagA: tag,
        tagB: member,
        connectionType: 'family',
        strength: 0.7,
        evidence: [`Mesma família temática: "${family?.name}"`],
        traces: [traces[traces.length - 1].id],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
  }

  // ================================================================
  // PASSO 2: Carregar conhecimento prévio do banco
  // ================================================================
  const existingConnections = await loadExistingConnections(normalized);
  const existingTraces = await loadLearningTraces(normalized);

  if (existingConnections.length > 0 || existingTraces.length > 0) {
    traces.push(createTrace('APRENDIZADO', 'memoria', `tag:${tag}`, {
      previousConnections: existingConnections.length,
      previousTraces: existingTraces.length,
      message: `O cérebro já possui ${existingConnections.length} conexão(ões) e ${existingTraces.length} registro(s) de aprendizado para esta tag.`
    }, 0.9));
  }

  // ================================================================
  // PASSO 3: Propagação de conhecimento (A→B + B→C = A↔C)
  // ================================================================
  const { propagated, insights } = propagateConnections(connections, allTags);
  
  if (propagated.length > 0) {
    traces.push(createTrace('PROPAGACAO', 'ml-engine', `tag:${tag}`, {
      newConnections: propagated.length,
      insights
    }, 0.7));
    connections.push(...propagated);
  }

  // ================================================================
  // PASSO 4: Calcular DNA semântico
  // ================================================================
  const dna = calculateDNA(tag, connections, family);

  // ================================================================
  // PASSO 5: Persistir tudo no banco (o cérebro APRENDE)
  // ================================================================
  for (const conn of connections.slice(0, 20)) {
    await persistNeuralConnection(conn);
  }
  for (const trace of traces) {
    await persistTrace(trace, normalized);
  }

  return {
    tag,
    totalConnections: connections.length,
    totalTraces: traces.length + existingTraces.length,
    neuralMap: connections,
    traces: [
      ...traces,
      // Incluir traces anteriores formatados
      ...existingTraces.slice(0, 10).map((t: any) => ({
        id: t.id,
        timestamp: t.created_at,
        action: (t.event_type || 'aprendizado').toUpperCase() as NeuralTrace['action'],
        origin: t.event_details?.origin || 'sistema',
        destination: t.event_details?.destination || `tag:${tag}`,
        payload: t.event_details || {},
        confidence: t.event_details?.confidence || 0.5
      }))
    ],
    propagatedInsights: insights,
    dnaSignature: dna
  };
}
