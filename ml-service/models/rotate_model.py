"""
Folksonomia Digital 2.0 — RotatE Link Prediction Model

Treina um modelo RotatE para predição de relações no grafo de conhecimento.
Triplas: (head, relation, tail) — ex: (obra, tem_material, madeira)

Usa PyKEEN para treinamento e avaliação.
Integrado ao ML Service via endpoint /predict-relations.
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger("rotate-model")

# ============================================================
# Configuração de Labels de Relação
# ============================================================

RELATION_TYPES = [
    'pertence_a_acervo',
    'criado_por',
    'mesmo_periodo',
    'mesma_tecnica',
    'influenciado_por',
    'proveniencia_de',
    'conflito_com',
    'validado_como',
    'related_to',
    'tem_material',
    'usa_tecnica',
    'pertence_contexto',
    'associada_a',
    'relacionado_a',
]

# ============================================================
# Treinamento
# ============================================================

def train_rotate(
    triples: list[tuple[str, str, str]],
    output_dir: str = "./models/rotate",
    embedding_dim: int = 256,
    epochs: int = 100,
    lr: float = 0.01
) -> dict:
    """
    Treina modelo RotatE com triplas do grafo de conhecimento.
    
    Args:
        triples: Lista de (head, relation, tail) strings
        output_dir: Diretório para salvar modelo
        embedding_dim: Dimensão dos embeddings de relação
        epochs: Número de épocas
        lr: Learning rate
    
    Returns:
        Métricas de avaliação
    """
    try:
        from pykeen.pipeline import pipeline
        from pykeen.triples import TriplesFactory
    except ImportError:
        logger.error("PyKEEN não instalado. Execute: pip install pykeen")
        return {"error": "pykeen not installed"}
    
    if len(triples) < 10:
        return {"error": "Número insuficiente de triplas (mínimo: 10)"}
    
    logger.info(f"Treinando RotatE com {len(triples)} triplas, dim={embedding_dim}, epochs={epochs}")
    
    # Criar TriplesFactory
    tf = TriplesFactory.from_labeled_triples(
        triples=[[h, r, t] for h, r, t in triples]
    )
    
    # Split train/test
    train_tf, test_tf = tf.split([0.8, 0.2])
    
    # Treinar
    result = pipeline(
        training=train_tf,
        testing=test_tf,
        model='RotatE',
        model_kwargs={'embedding_dim': embedding_dim},
        training_kwargs={
            'num_epochs': epochs,
            'batch_size': min(64, len(triples) // 2),
        },
        optimizer_kwargs={'lr': lr},
        random_seed=42,
    )
    
    # Métricas
    metrics = {
        'hits_at_1': float(result.metric_results.get_metric('hits@1')),
        'hits_at_3': float(result.metric_results.get_metric('hits@3')),
        'hits_at_10': float(result.metric_results.get_metric('hits@10')),
        'mean_rank': float(result.metric_results.get_metric('mean_rank')),
        'mrr': float(result.metric_results.get_metric('mean_reciprocal_rank')),
        'num_triples': len(triples),
        'num_entities': tf.num_entities,
        'num_relations': tf.num_relations,
        'trained_at': datetime.utcnow().isoformat(),
    }
    
    # Salvar
    os.makedirs(output_dir, exist_ok=True)
    result.save_to_directory(output_dir)
    
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    
    # Salvar mapeamentos de entidades/relações
    entity_to_id = dict(zip(tf.entity_to_id.keys(), tf.entity_to_id.values()))
    relation_to_id = dict(zip(tf.relation_to_id.keys(), tf.relation_to_id.values()))
    
    with open(os.path.join(output_dir, "entity_mapping.json"), "w") as f:
        json.dump(entity_to_id, f, indent=2, ensure_ascii=False)
    
    with open(os.path.join(output_dir, "relation_mapping.json"), "w") as f:
        json.dump(relation_to_id, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✅ RotatE treinado: MRR={metrics['mrr']:.4f}, Hits@10={metrics['hits_at_10']:.4f}")
    
    return metrics


# ============================================================
# Predição de Links
# ============================================================

def predict_relations(
    head: str,
    tail: str,
    model_dir: str = "./models/rotate",
    top_k: int = 5
) -> list[dict]:
    """
    Dado um par de entidades, prediz as relações mais prováveis.
    
    Returns:
        Lista de {relation, score} ordenada por score
    """
    try:
        from pykeen.pipeline import PipelineResult
    except ImportError:
        return [{"relation": "related_to", "score": 0.5, "source": "heuristic_fallback"}]
    
    result_path = os.path.join(model_dir, "trained_model")
    if not os.path.exists(result_path):
        return [{"relation": "related_to", "score": 0.5, "source": "heuristic_fallback"}]
    
    try:
        # Carregar mapeamentos
        with open(os.path.join(model_dir, "entity_mapping.json")) as f:
            entity_to_id = json.load(f)
        with open(os.path.join(model_dir, "relation_mapping.json")) as f:
            relation_to_id = json.load(f)
        
        # Verificar se entidades existem
        if head not in entity_to_id or tail not in entity_to_id:
            return [{"relation": "related_to", "score": 0.3, "source": "entity_unknown"}]
        
        # Carregar modelo e predizer
        import torch
        from pykeen.models import RotatE
        
        model = torch.load(os.path.join(result_path, "trained_model.pkl"), map_location="cpu")
        
        results = []
        id2relation = {v: k for k, v in relation_to_id.items()}
        
        head_id = entity_to_id[head]
        tail_id = entity_to_id[tail]
        
        for rel_name, rel_id in relation_to_id.items():
            import torch
            h = torch.tensor([[head_id]])
            r = torch.tensor([[rel_id]])
            t = torch.tensor([[tail_id]])
            
            with torch.no_grad():
                score = model.score_hrt(torch.cat([h, r, t], dim=1)).item()
            
            results.append({
                "relation": rel_name,
                "score": round(1.0 / (1.0 + abs(score)), 4),  # Normalizar
                "source": "rotate_model"
            })
        
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
        
    except Exception as e:
        logger.warning(f"RotatE prediction failed: {e}")
        return [{"relation": "related_to", "score": 0.5, "source": "rotate_error"}]


def predict_tail(
    head: str,
    relation: str,
    model_dir: str = "./models/rotate",
    top_k: int = 10
) -> list[dict]:
    """
    Dado head + relation, prediz os tails mais prováveis.
    Ex: predict_tail("Retábulo", "tem_material") → ["madeira", "ouro", ...]
    """
    # Placeholder — implementação completa requer modelo carregado
    return [{"entity": "unknown", "score": 0.0, "source": "not_implemented"}]
