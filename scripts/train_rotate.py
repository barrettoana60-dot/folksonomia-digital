import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
import json
import math

# ====================================================================
# Folksonomia Digital 2.0 — RotatE Knowledge Graph Training
# Etapa 2: Aprendizado Contínuo de Relações
# ====================================================================

# RotatE: h \circ r \approx t 
# (H_real + i H_imag) * (cos(\theta) + i sin(\theta)) \approx (T_real + i T_imag)

EMBEDDING_DIM = 384
MARGIN = 9.0
LEARNING_RATE = 0.001
EPOCHS = 100
BATCH_SIZE = 16

class RotatEDataset(Dataset):
    def __init__(self, data_path="folksonomia-kg-data.json"):
        # Se o arquivo não existir, criaremos dados simulados para a demonstração arquitetural
        if os.path.exists(data_path):
            with open(data_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            print("Aviso: Arquivo de dados reais não encontrado. Usando dataset mock para validação do pipeline da Etapa 2.")
            data = [
                {"head": "Cálice Colonial", "relation": "PERTENCE_A", "tail": "Liturgia", "signal": 1},
                {"head": "Cálice Colonial", "relation": "PERTENCE_A", "tail": "Ourivesaria Europeia", "signal": 1},
                {"head": "Cálice Colonial", "relation": "PERTENCE_A", "tail": "Período Jesuítico", "signal": 1},
                # Sinal Negativo: Curador rejeitou essa inferência
                {"head": "Cálice Colonial", "relation": "PERTENCE_A", "tail": "Arte Moderna", "signal": -1},
            ]

        self.entities = list(set([item["head"] for item in data] + [item["tail"] for item in data]))
        self.relations = list(set([item["relation"] for item in data]))
        
        self.entity2id = {ent: i for i, ent in enumerate(self.entities)}
        self.relation2id = {rel: i for i, rel in enumerate(self.relations)}
        
        self.triplets = []
        for item in data:
            self.triplets.append((
                self.entity2id[item["head"]],
                self.relation2id[item["relation"]],
                self.entity2id[item["tail"]],
                item["signal"]
            ))

    def __len__(self):
        return len(self.triplets)

    def __getitem__(self, idx):
        h, r, t, signal = self.triplets[idx]
        return torch.tensor(h), torch.tensor(r), torch.tensor(t), torch.tensor(signal, dtype=torch.float)


class RotatEModel(nn.Module):
    def __init__(self, num_entities, num_relations, embedding_dim, margin):
        super(RotatEModel, self).__init__()
        self.num_entities = num_entities
        self.num_relations = num_relations
        self.embedding_dim = embedding_dim
        self.margin = margin
        
        # RotatE mapeia entidades para vetores no plano complexo (Real e Imaginário)
        self.entity_embeddings = nn.Embedding(num_entities, embedding_dim * 2)
        # Relações são fases (ângulos) no plano complexo
        self.relation_embeddings = nn.Embedding(num_relations, embedding_dim)

        # Inicialização baseada no paper do RotatE
        epsilon = 2.0
        self.embedding_range = nn.Parameter(torch.tensor((self.margin + epsilon) / embedding_dim), requires_grad=False)
        nn.init.uniform_(tensor=self.entity_embeddings.weight, a=-self.embedding_range.item(), b=self.embedding_range.item())
        nn.init.uniform_(tensor=self.relation_embeddings.weight, a=-self.embedding_range.item(), b=self.embedding_range.item())

    def forward(self, head, relation, tail):
        # Entidades: [batch_size, embedding_dim * 2]
        h = self.entity_embeddings(head)
        t = self.entity_embeddings(tail)
        
        # Divide em parte real e imaginária
        pi = math.pi
        re_head, im_head = torch.chunk(h, 2, dim=-1)
        re_tail, im_tail = torch.chunk(t, 2, dim=-1)

        # Relações (apenas fase)
        r = self.relation_embeddings(relation)
        phase_relation = r / (self.embedding_range.item() / pi)
        re_relation = torch.cos(phase_relation)
        im_relation = torch.sin(phase_relation)

        # Rotação de Hadamard no domínio complexo: h * r = (hr - hi*ri) + i(hr*ri + hi*rr)
        re_score = re_head * re_relation - im_head * im_relation
        im_score = re_head * im_relation + im_head * re_relation
        
        re_score = re_score - re_tail
        im_score = im_score - im_tail
        
        # Distância
        score = torch.stack([re_score, im_score], dim=0)
        score = score.norm(dim=0)
        score = self.margin - score.sum(dim=-1)
        return score

def train():
    print("=" * 60)
    print("Folksonomia Digital 2.0 — Treinamento RotatE")
    print("=" * 60)
    
    dataset = RotatEDataset()
    dataloader = DataLoader(dataset, batch_size=BATCH_SIZE, shuffle=True)
    
    model = RotatEModel(
        num_entities=len(dataset.entities),
        num_relations=len(dataset.relations),
        embedding_dim=EMBEDDING_DIM // 2, # Complex domain splits in two
        margin=MARGIN
    )
    
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE)
    
    # MarginRankingLoss personalizado que aceita sinais negativos
    def loss_fn(scores, signals):
        # Se signal == 1, queremos maximizar o score. Se signal == -1, minimizar.
        return torch.mean(-torch.nn.functional.logsigmoid(scores * signals))

    print(f"[{len(dataset.entities)} Entidades, {len(dataset.relations)} Relações detectadas]")
    print(f"Iniciando treinamento com Negative Sampling (Sinal do Curador)...\n")

    for epoch in range(1, EPOCHS + 1):
        total_loss = 0
        for head, rel, tail, signal in dataloader:
            optimizer.zero_grad()
            scores = model(head, rel, tail)
            loss = loss_fn(scores, signal)
            loss.backward()
            optimizer.step()
            total_loss += loss.item()
            
        if epoch % 10 == 0:
            print(f"Época {epoch}/{EPOCHS} | Loss: {total_loss:.4f}")

    # Salvar mapeamento
    print("\nTreinamento Concluído. Salvando modelo e mapeamento de tensores...")
    os.makedirs("./modernbert-museal-ner-final/rotate", exist_ok=True)
    torch.save(model.state_dict(), "./modernbert-museal-ner-final/rotate/rotate_model.pth")
    
    with open("./modernbert-museal-ner-final/rotate/kg_mapping.json", "w", encoding="utf-8") as f:
        json.dump({
            "entities": dataset.entity2id,
            "relations": dataset.relation2id
        }, f, ensure_ascii=False, indent=2)
        
    print("[OK] Modelo RotatE salvo com sucesso na arquitetura.")

if __name__ == "__main__":
    train()
