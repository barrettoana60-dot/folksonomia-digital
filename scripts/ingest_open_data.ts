/**
 * Folksonomia Digital 2.0 — Simulação de Ingestão de APIs e Arbitragem
 * Etapa 1: Classificação e Separação de Confiança
 */

import { reconcileFields } from '../lib/ml/arbitration';
import { supabaseAdmin } from '../lib/supabase/client';
import { eventBus, createIngestionEvent } from '../lib/ml/events';
import type { ClassifiedField } from '../lib/ml/types';

async function ingestOpenData() {
  console.log('============================================================');
  console.log('Folksonomia Digital 2.0 — Ingestão de Open Data e Arbitragem');
  console.log('============================================================\n');

  // Obra Fictícia: Um cálice do século 18
  const obraId = 'calice-colonial-01';

  // Metadados vindos do IBRAM (Institucional Brasileiro)
  const ibramData: ClassifiedField[] = [
    { category: 'MATERIAL', value: 'Ouro e Prata', confidence: 0.95, qualifier: 'verified', source: 'ibram' },
    { category: 'DATA', value: 'Século 18', confidence: 0.9, qualifier: 'estimated', source: 'ibram' },
    { category: 'ORIGEM', value: 'Minas Gerais, Brasil', confidence: 0.99, qualifier: 'verified', source: 'ibram' }
  ];

  // Metadados vindos da Europeana (Agregador Europeu)
  // Notar que Europeana diverge na Data e Origem
  const europeanaData: ClassifiedField[] = [
    { category: 'MATERIAL', value: 'Ouro', confidence: 0.90, qualifier: 'verified', source: 'europeana' },
    { category: 'DATA', value: '1750', confidence: 0.85, qualifier: 'verified', source: 'europeana' },
    { category: 'ORIGEM', value: 'Portugal', confidence: 0.8, qualifier: 'verified', source: 'europeana' },
    { category: 'ESTILO', value: 'Barroco', confidence: 0.95, qualifier: 'verified', source: 'europeana' }
  ];

  console.log('[1/4] Recebendo dados das APIs:');
  console.log('  IBRAM:', ibramData.map(d => `${d.category}=${d.value}`).join(' | '));
  console.log('  Europeana:', europeanaData.map(d => `${d.category}=${d.value}`).join(' | '));

  console.log('\n[2/4] Executando Motor de Arbitragem (Separação de Confiança)...');
  
  // Reconciliar os campos (Etapa 1: Mecanismo 2)
  const { merged, conflicts } = reconcileFields(ibramData, europeanaData, 'ibram', 'europeana');

  console.log('\n  >> Resultado da Arbitragem:');
  merged.forEach(field => {
    console.log(`    [${field.category}] Vencedor: "${field.value}" (Fonte: ${field.source}, Qualificador: ${field.qualifier}, Confiança: ${(field.confidence * 100).toFixed(0)}%)`);
  });

  if (conflicts.length > 0) {
    console.log('\n  >> Conflitos Detectados (Para curadoria humana):');
    conflicts.forEach(c => {
      console.log(`    [${c.field}] IBRAM diz "${c.sourceA.value}" vs Europeana diz "${c.sourceB.value}". (Resolução automática: ${c.resolution})`);
    });
  }

  console.log('\n[3/4] Persistindo Camada Factual no Supabase...');
  
  // Aqui, em produção, inseriríamos a Camada Factual na tabela apropriada e os conflitos na tabela de curadoria.
  // Como estamos testando, vamos simular a emissão do evento.

  console.log('\n[4/4] Disparando Evento de Ingestão no Barramento (Kafka-like)...');
  
  const ingestionEvent = createIngestionEvent({
    source: 'ibram',
    entityId: obraId,
    fields: merged,
    triggersReprocessing: true
  });

  // Emite para o EventBus, o que deve engatilhar a GAT e o RotatE futuramente
  await eventBus.emit(ingestionEvent);

  console.log('  [OK] Evento disparado:', ingestionEvent.id);
  console.log('\n>>> ETAPA 1 (Classificação, Arbitragem e Resolução de Dano) COMPLETADA COM SUCESSO. <<<');
}

ingestOpenData().catch(console.error);
