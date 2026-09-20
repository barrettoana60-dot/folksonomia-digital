"""
Folksonomia Digital 2.0 — GAT Community Detection Model

Graph Attention Network para detecção de comunidades sobrepostas.
Cada entidade pode pertencer a múltiplas comunidades com pesos diferentes.

Input: embeddings das entidades + grafo de relações
Output: pertencimento probabilístico a comunidades (multi-label)

Usa PyTorch Geometric (PyG).
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

import numpy as np

logger = logging.getLogger("gat-model")

# ============================================================
# Comunidades Predefinidas (expandíveis via treinamento)
# ============================================================

COMMUNITY_LABELS = [
    'religioso',
    'maternidade',
    'guerra',
    'tecnica_artistica',
    'colonial',
    'natureza',
    'proveniencia',
    'identidade',
    'modernismo',
    'arte_popular',
    'ciencia',
    'politica',
]

# ============================================================
# Modelo GAT
# ============================================================

def build_gat_model(
    num_features: int = 768,
    num_communities: int = None,
    num_heads: int = 4,
    hidden_dim: int = 128,
    dropout: float = 0.3,
):
    """Constrói uma GAT para classificação multi-label de comunidades."""
    try:
        import torch
        import torch.nn as nn
        from torch_geometric.nn import GATConv
    except ImportError:
        logger.error("PyTorch Geometric não instalado")
        return None

    num_communities = num_communities or len(COMMUNITY_LABELS)

    class GATCommunityDetector(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = GATConv(num_features, hidden_dim, heads=num_heads, dropout=dropout)
            self.conv2 = GATConv(hidden_dim * num_heads, hidden_dim, heads=1, concat=False, dropout=dropout)
            self.classifier = nn.Sequential(
                nn.Linear(hidden_dim, hidden_dim // 2),
                nn.ReLU(),
                nn.Dropout(dropout),
                nn.Linear(hidden_dim // 2, num_communities),
                nn.Sigmoid()  # Multi-label: cada comunidade independente
            )
            self.dropout = nn.Dropout(dropout)

        def forward(self, x, edge_index):
            import torch.nn.functional as F
            x = self.dropout(x)
            x = F.elu(self.conv1(x, edge_index))
            x = self.dropout(x)
            x = F.elu(self.conv2(x, edge_index))
            return self.classifier(x)

    return GATCommunityDetector()


# ============================================================
# Treinamento
# ============================================================

def train_gat(
    node_embeddings: list[list[float]],
    edge_list: list[tuple[int, int]],
    labels: Optional[list[list[float]]] = None,
    output_dir: str = "./models/gat",
    epochs: int = 200,
    lr: float = 0.005,
) -> dict:
    """
    Treina GAT para detecção de comunidades.
    
    Args:
        node_embeddings: Lista de vetores 768d (um por entidade)
        edge_list: Lista de (source_idx, target_idx)
        labels: Multi-hot labels (se disponíveis para supervisão)
        output_dir: Diretório de saída
        epochs: Épocas de treinamento
        lr: Learning rate
    
    Returns:
        Métricas de treinamento
    """
    try:
        import torch
        import torch.nn as nn
        from torch_geometric.data import Data
    except ImportError:
        return {"error": "torch_geometric not installed"}
    
    num_nodes = len(node_embeddings)
    if num_nodes < 5:
        return {"error": "Número insuficiente de nós (mínimo: 5)"}
    
    num_communities = len(COMMUNITY_LABELS)
    
    # Preparar dados
    x = torch.tensor(node_embeddings, dtype=torch.float)
    
    if edge_list:
        edges = torch.tensor(edge_list, dtype=torch.long).t().contiguous()
        # Adicionar arestas reversas (grafo não-direcionado)
        edges_rev = edges.flip(0)
        edge_index = torch.cat([edges, edges_rev], dim=1)
    else:
        # Sem arestas: criar self-loops
        edge_index = torch.stack([
            torch.arange(num_nodes), 
            torch.arange(num_nodes)
        ])
    
    # Labels: se não fornecidos, usar auto-supervisionamento via clustering
    if labels is None:
        # K-means inicialização
        from sklearn.cluster import KMeans
        km = KMeans(n_clusters=min(num_communities, num_nodes), random_state=42, n_init=10)
        cluster_ids = km.fit_predict(np.array(node_embeddings))
        
        # Converter para multi-hot soft labels
        y = torch.zeros(num_nodes, num_communities)
        for i, c in enumerate(cluster_ids):
            if c < num_communities:
                y[i, c] = 1.0
                # Adicionar soft membership aos vizinhos do cluster
                center = km.cluster_centers_[c]
                for j in range(num_communities):
                    if j < len(km.cluster_centers_):
                        dist = np.linalg.norm(np.array(node_embeddings[i]) - km.cluster_centers_[j])
                        y[i, j] = max(0, 1.0 - dist / 10.0)
    else:
        y = torch.tensor(labels, dtype=torch.float)
    
    data = Data(x=x, edge_index=edge_index, y=y)
    
    # Modelo
    model = build_gat_model(num_features=x.size(1), num_communities=num_communities)
    if model is None:
        return {"error": "Falha ao construir modelo GAT"}
    
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=5e-4)
    criterion = nn.BCELoss()
    
    # Treinar
    logger.info(f"Treinando GAT: {num_nodes} nós, {edge_index.size(1)} arestas, {epochs} epochs")
    
    model.train()
    losses = []
    for epoch in range(epochs):
        optimizer.zero_grad()
        out = model(data.x, data.edge_index)
        loss = criterion(out, data.y)
        loss.backward()
        optimizer.step()
        losses.append(loss.item())
        
        if (epoch + 1) % 50 == 0:
            logger.info(f"  Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
    
    # Avaliar
    model.eval()
    with torch.no_grad():
        predictions = model(data.x, data.edge_index)
    
    # Métricas
    pred_labels = (predictions > 0.5).float()
    accuracy = (pred_labels == data.y).float().mean().item()
    
    metrics = {
        'final_loss': losses[-1] if losses else 0,
        'accuracy': round(accuracy, 4),
        'num_nodes': num_nodes,
        'num_edges': edge_index.size(1),
        'num_communities': num_communities,
        'epochs': epochs,
        'trained_at': datetime.utcnow().isoformat(),
    }
    
    # Salvar
    os.makedirs(output_dir, exist_ok=True)
    torch.save(model.state_dict(), os.path.join(output_dir, "gat_model.pt"))
    
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump(metrics, f, indent=2)
    
    with open(os.path.join(output_dir, "community_labels.json"), "w") as f:
        json.dump(COMMUNITY_LABELS, f, indent=2, ensure_ascii=False)
    
    logger.info(f"✅ GAT treinado: accuracy={accuracy:.4f}, loss={losses[-1]:.4f}")
    
    return metrics


# ============================================================
# Predição de Comunidades
# ============================================================

def predict_communities(
    node_embedding: list[float],
    edge_index: Optional[list[tuple[int, int]]] = None,
    model_dir: str = "./models/gat",
    threshold: float = 0.15,
) -> list[dict]:
    """
    Prediz pertencimento de uma entidade a comunidades.
    
    Returns:
        Lista de {community, weight, name} ordenada por peso
    """
    model_path = os.path.join(model_dir, "gat_model.pt")
    
    if not os.path.exists(model_path):
        # Fallback: heurística baseada em keywords
        return _heuristic_communities(node_embedding)
    
    try:
        import torch
        from torch_geometric.data import Data
        
        model = build_gat_model(num_features=len(node_embedding))
        model.load_state_dict(torch.load(model_path, map_location="cpu"))
        model.eval()
        
        x = torch.tensor([node_embedding], dtype=torch.float)
        edge_index = torch.tensor([[0], [0]])  # Self-loop para nó único
        
        with torch.no_grad():
            predictions = model(x, edge_index)[0]
        
        results = []
        for i, (prob, label) in enumerate(zip(predictions.tolist(), COMMUNITY_LABELS)):
            if prob > threshold:
                results.append({
                    "community_id": label,
                    "community_name": _community_display_name(label),
                    "weight": round(prob, 4),
                    "source": "gat_model"
                })
        
        results.sort(key=lambda x: x["weight"], reverse=True)
        return results
        
    except Exception as e:
        logger.warning(f"GAT prediction failed: {e}")
        return _heuristic_communities(node_embedding)


def _heuristic_communities(embedding: list[float]) -> list[dict]:
    """Fallback heurístico quando GAT não está disponível."""
    return [{
        "community_id": "unknown",
        "community_name": "Não classificado",
        "weight": 0.5,
        "source": "heuristic_fallback"
    }]


def _community_display_name(community_id: str) -> str:
    """Converte ID da comunidade para nome exibível."""
    names = {
        'religioso': 'Religiosidade e Sacralidade',
        'maternidade': 'Maternidade e Cuidado',
        'guerra': 'Conflito e Resistência',
        'tecnica_artistica': 'Técnicas Artísticas',
        'colonial': 'Período Colonial',
        'natureza': 'Natureza e Paisagem',
        'proveniencia': 'Proveniência e Circulação',
        'identidade': 'Identidade e Memória',
        'modernismo': 'Modernismo Brasileiro',
        'arte_popular': 'Arte Popular',
        'ciencia': 'Ciência e Técnica',
        'politica': 'Política e Poder',
    }
    return names.get(community_id, community_id.replace('_', ' ').title())
