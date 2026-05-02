import os
import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.optim as optim
import json

# ====================================================================
# Folksonomia Digital 2.0 — Treinamento GAT (Graph Attention Networks)
# Etapa 3: Problema das Fronteiras Fluidas (Multi-Membership)
# ====================================================================

# O objetivo desta rede não é classificar um objeto em uma única "caixa",
# mas gerar um vetor de atenção distribuído sobre todos os grupos temáticos.
# Ex: Cálice Colonial -> [Liturgia: 0.8, Jesuítico: 0.6, Barroco: 0.4]

HIDDEN_DIM = 128
LEARNING_RATE = 0.005
EPOCHS = 100
DROPOUT = 0.2

class SimpleGATLayer(nn.Module):
    def __init__(self, in_features, out_features, alpha=0.2):
        super(SimpleGATLayer, self).__init__()
        self.in_features = in_features
        self.out_features = out_features
        self.alpha = alpha
        
        self.W = nn.Linear(in_features, out_features, bias=False)
        self.a = nn.Linear(2 * out_features, 1, bias=False)
        self.leakyrelu = nn.LeakyReLU(self.alpha)

    def forward(self, h, adj):
        # h: [N, in_features]
        # adj: [N, N] (matriz de adjacência)
        Wh = self.W(h) # [N, out_features]
        N = Wh.size()[0]

        # Prepara pares de nós (concatenação para atenção)
        a_input = torch.cat([Wh.repeat(1, N).view(N * N, -1), Wh.repeat(N, 1)], dim=1).view(N, -1, 2 * self.out_features)
        
        # Calcula coeficientes de atenção brutos
        e = self.leakyrelu(self.a(a_input).squeeze(2)) # [N, N]
        
        # Mascara onde não há arestas (adj == 0)
        zero_vec = -9e15 * torch.ones_like(e)
        attention = torch.where(adj > 0, e, zero_vec)
        
        # Normaliza coeficientes de atenção
        attention = F.softmax(attention, dim=1)
        attention = F.dropout(attention, DROPOUT, training=self.training)
        
        # Aplica a atenção sobre as features vizinhas
        h_prime = torch.matmul(attention, Wh)
        return F.elu(h_prime)

class MusealGAT(nn.Module):
    def __init__(self, num_features, num_classes):
        super(MusealGAT, self).__init__()
        # Recebe embedding do ModernBERT (ex: 384d)
        self.gat1 = SimpleGATLayer(num_features, HIDDEN_DIM)
        # Camada final de projeção para os "N" Grupos Temáticos
        self.classifier = nn.Linear(HIDDEN_DIM, num_classes)

    def forward(self, features, adj):
        x = self.gat1(features, adj)
        x = F.dropout(x, DROPOUT, training=self.training)
        # MULTI-LABEL: Não usamos Softmax (que forçaria soma 1).
        # Usamos Sigmoid para que um objeto possa ter 0.9 em Liturgia e 0.8 em Jesuítico simultaneamente.
        logits = self.classifier(x)
        return torch.sigmoid(logits)

def create_mock_graph():
    # Simula dados do pipeline: 4 objetos, 3 grupos (Liturgia, Jesuítico, Arte Moderna)
    nodes = ["Cálice Colonial", "Pintura Barroca", "Instalação Contemporânea", "Cruz Processional"]
    num_nodes = len(nodes)
    
    # Adjacência baseada nas triplas descobertas pelo RotatE (Etapa 2)
    # [N, N]
    adj = torch.zeros((num_nodes, num_nodes))
    # Cálice <-> Pintura (Compartilham época)
    adj[0, 1] = 1; adj[1, 0] = 1
    # Cálice <-> Cruz (Compartilham liturgia)
    adj[0, 3] = 1; adj[3, 0] = 1
    # Instalação Contemporânea (Isolada)
    adj[2, 2] = 1
    
    # Auto-conexão obrigatória no GAT
    adj = adj + torch.eye(num_nodes)

    # Features simuladas do ModernBERT (384d)
    features = torch.randn((num_nodes, 384))
    
    # Multi-label targets (Ground truth dos curadores)
    # Grupos: [Liturgia, Jesuítico, Arte Moderna]
    labels = torch.tensor([
        [1.0, 1.0, 0.0], # Cálice Colonial: Liturgia + Jesuítico
        [1.0, 0.0, 0.0], # Pintura Barroca: Religioso/Liturgia (Simplificado)
        [0.0, 0.0, 1.0], # Instalação Contemporânea: Arte Moderna
        [1.0, 0.0, 0.0], # Cruz Processional: Liturgia
    ], dtype=torch.float)
    
    return nodes, features, adj, labels

def train():
    print("=" * 60)
    print("Folksonomia Digital 2.0 — Treinamento GAT (Etapa 3)")
    print("Resolução do Problema das Fronteiras (Multi-Membership)")
    print("=" * 60)
    
    nodes, features, adj, labels = create_mock_graph()
    num_classes = labels.shape[1]
    
    model = MusealGAT(num_features=384, num_classes=num_classes)
    optimizer = optim.Adam(model.parameters(), lr=LEARNING_RATE, weight_decay=5e-4)
    
    # Binary Cross Entropy Loss para Multi-Label
    criterion = nn.BCELoss()
    
    print("Iniciando aprendizado das Fronteiras Fluidas...")
    
    for epoch in range(1, EPOCHS + 1):
        model.train()
        optimizer.zero_grad()
        
        # Propagação do Grafo
        output = model(features, adj)
        
        # Cálculo de Perda (Multi-label)
        loss = criterion(output, labels)
        
        loss.backward()
        optimizer.step()
        
        if epoch % 10 == 0:
            print(f"Época {epoch}/{EPOCHS} | BCELoss: {loss.item():.4f}")

    # Exibindo como a IA modelou a sobreposição de grupos
    model.eval()
    with torch.no_grad():
        final_probs = model(features, adj)
        print("\n=== ATENÇÃO MULTI-MEMBERSHIP APRENDIDA ===")
        grupos = ["Litúrgico", "Jesuítico", "Arte Moderna"]
        
        for i, node in enumerate(nodes):
            print(f"\nObjeto: {node}")
            probs = final_probs[i].tolist()
            for j, grupo in enumerate(grupos):
                print(f"  -> {grupo}: {probs[j]*100:.1f}%")
                
    # Salvar Modelo
    os.makedirs("./modernbert-museal-ner-final/gat", exist_ok=True)
    torch.save(model.state_dict(), "./modernbert-museal-ner-final/gat/gat_model.pth")
    print("\n[OK] Modelo GAT salvo. Fronteiras fluidas arquitetadas com sucesso.")

if __name__ == "__main__":
    train()
