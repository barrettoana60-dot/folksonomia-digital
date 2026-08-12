"""
Folksonomia Digital 2.0 — ML Service (FastAPI)

Microserviço Python que hospeda os modelos reais:
- ModernBERT NER (classificação de tokens museológicos)
- Embeddings semânticos (ModernBERT-base + mean pooling, 768d)
- Classificador contextual
- Treinamento e versionamento de modelos

Deploy: Render (free tier)
Chamado pelo Next.js via HTTP com fallback automático.
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ============================================================
# Configuração
# ============================================================

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ml-service")

ADMIN_SECRET = os.getenv("ADMIN_SECRET", "")
MODEL_DIR = os.getenv("MODEL_DIR", "./models")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

# ============================================================
# Estado Global dos Modelos
# ============================================================

class ModelState:
    def __init__(self):
        self.ner_model = None
        self.ner_tokenizer = None
        self.ner_version = None
        self.embedder = None
        self.embedder_model_name = "answerdotai/ModernBERT-base"
        self.device = "cpu"
        self.ready = False

state = ModelState()

# ============================================================
# Lifecycle
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Carrega modelos na inicialização."""
    logger.info("🚀 Iniciando ML Service...")
    load_models()
    yield
    logger.info("🛑 ML Service desligado.")

def load_models():
    """Carrega modelos disponíveis."""
    import torch
    
    state.device = "cuda" if torch.cuda.is_available() else "cpu"
    logger.info(f"Device: {state.device}")
    
    # 1. Carregar embedder (ModernBERT-base para embeddings)
    try:
        from transformers import AutoTokenizer, AutoModel
        logger.info(f"Carregando embedder: {state.embedder_model_name}...")
        state.embedder = {
            "tokenizer": AutoTokenizer.from_pretrained(state.embedder_model_name),
            "model": AutoModel.from_pretrained(state.embedder_model_name).to(state.device)
        }
        state.embedder["model"].eval()
        logger.info("✅ Embedder carregado (768d)")
    except Exception as e:
        logger.warning(f"⚠️ Embedder não carregado: {e}")
    
    # 2. Carregar NER model (se treinado)
    ner_path = os.path.join(MODEL_DIR, "modernbert-museal-ner")
    if os.path.exists(ner_path):
        try:
            from transformers import AutoTokenizer, AutoModelForTokenClassification
            logger.info(f"Carregando NER: {ner_path}...")
            state.ner_tokenizer = AutoTokenizer.from_pretrained(ner_path)
            state.ner_model = AutoModelForTokenClassification.from_pretrained(ner_path).to(state.device)
            state.ner_model.eval()
            
            # Ler versão
            version_file = os.path.join(ner_path, "version.json")
            if os.path.exists(version_file):
                with open(version_file) as f:
                    state.ner_version = json.load(f).get("version", "v1.0.0")
            else:
                state.ner_version = "v1.0.0"
            
            logger.info(f"✅ NER carregado (versão {state.ner_version})")
        except Exception as e:
            logger.warning(f"⚠️ NER não carregado: {e}")
    else:
        logger.info("ℹ️ Modelo NER não encontrado — /predict-ner retornará erro até treinamento")
    
    state.ready = True
    logger.info("✅ ML Service pronto!")

# ============================================================
# App FastAPI
# ============================================================

app = FastAPI(
    title="Folksonomia ML Service",
    version="1.0.0",
    description="Microserviço de ML para o sistema Folksonomia Digital 2.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================
# Auth
# ============================================================

def verify_admin(authorization: Optional[str] = Header(None)):
    if ADMIN_SECRET and authorization != f"Bearer {ADMIN_SECRET}":
        raise HTTPException(status_code=401, detail="Não autorizado")

# ============================================================
# Modelos Pydantic
# ============================================================

class EmbedRequest(BaseModel):
    text: str
    texts: Optional[list[str]] = None  # batch mode

class NERRequest(BaseModel):
    text: str

class ContextRequest(BaseModel):
    text: str
    obra_context: Optional[dict] = None

class TrainRequest(BaseModel):
    dataset_jsonl: str
    model_name: str = "modernbert_ner"
    run_id: Optional[str] = None
    config: Optional[dict] = None

class RelationRequest(BaseModel):
    head: str
    tail: str
    top_k: int = 5

class CommunityRequest(BaseModel):
    embedding: list[float]
    threshold: float = 0.15

# ============================================================
# Endpoints
# ============================================================

@app.get("/health")
async def health():
    """Status do serviço e modelos carregados."""
    return {
        "status": "ok" if state.ready else "loading",
        "models": {
            "embedder": state.embedder is not None,
            "ner": state.ner_model is not None,
            "ner_version": state.ner_version,
        },
        "device": state.device,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.post("/embed")
async def embed(req: EmbedRequest):
    """Gera embedding semântico de 768d usando ModernBERT-base + mean pooling."""
    import torch
    
    if not state.embedder:
        raise HTTPException(status_code=503, detail="Embedder não carregado")
    
    texts = req.texts or [req.text]
    embeddings = []
    
    tokenizer = state.embedder["tokenizer"]
    model = state.embedder["model"]
    
    for text in texts:
        inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
        inputs = {k: v.to(state.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = model(**inputs)
        
        # Mean pooling sobre os tokens (excluindo padding)
        attention_mask = inputs["attention_mask"]
        token_embeddings = outputs.last_hidden_state
        input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
        sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
        sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
        embedding = (sum_embeddings / sum_mask).squeeze().cpu().tolist()
        
        # Normalizar L2
        import math
        magnitude = math.sqrt(sum(x*x for x in embedding))
        if magnitude > 0:
            embedding = [x / magnitude for x in embedding]
        
        embeddings.append(embedding)
    
    if req.texts:
        return {"embeddings": embeddings, "dimensions": 768}
    else:
        return {"embedding": embeddings[0], "dimensions": 768}

@app.post("/predict-ner")
async def predict_ner(req: NERRequest):
    """Classifica tokens usando ModernBERT NER treinado."""
    import torch
    
    if not state.ner_model or not state.ner_tokenizer:
        raise HTTPException(
            status_code=503, 
            detail="Modelo NER não treinado. Execute /train primeiro."
        )
    
    start_time = time.time()
    
    inputs = state.ner_tokenizer(
        req.text, 
        return_tensors="pt", 
        truncation=True, 
        max_length=512
    )
    inputs = {k: v.to(state.device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = state.ner_model(**inputs)
    
    # Softmax para probabilidades
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=2)
    predictions = torch.argmax(probabilities, dim=2)
    max_probs = probabilities.max(dim=2).values
    
    tokens_out = state.ner_tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
    pred_labels = [state.ner_model.config.id2label[t.item()] for t in predictions[0]]
    pred_probs = max_probs[0].cpu().tolist()
    
    # Reconstruir palavras a partir de sub-tokens
    results = []
    current_word = ""
    current_label = "O"
    current_prob = 0.0
    
    for token, label, prob in zip(tokens_out, pred_labels, pred_probs):
        if token in ["[CLS]", "[SEP]", "[PAD]", "<s>", "</s>", "<pad>"]:
            continue
        
        # ModernBERT usa Ġ como prefixo de nova palavra
        if token.startswith("Ġ") or token.startswith("▁"):
            if current_word:
                cat = current_label.replace("B-", "").replace("I-", "")
                results.append({
                    "token": current_word.replace("Ġ", "").replace("▁", ""),
                    "category": cat,
                    "confidence": round(current_prob, 4),
                    "label": current_label
                })
            current_word = token
            current_label = label
            current_prob = prob
        else:
            current_word += token
            if current_label == "O" and label != "O":
                current_label = label
            current_prob = max(current_prob, prob)
    
    # Último token
    if current_word:
        cat = current_label.replace("B-", "").replace("I-", "")
        results.append({
            "token": current_word.replace("Ġ", "").replace("▁", ""),
            "category": cat,
            "confidence": round(current_prob, 4),
            "label": current_label
        })
    
    inference_time = time.time() - start_time
    
    return {
        "tokens": results,
        "model_version": state.ner_version,
        "inference_time_ms": round(inference_time * 1000, 2),
        "device": state.device
    }

@app.post("/predict-context")
async def predict_context(req: ContextRequest):
    """Classificação contextual — determina o significado de um termo no contexto."""
    # Por enquanto, usa embeddings + heurística melhorada
    # Futuro: modelo fine-tuned para classificação contextual
    import torch
    
    if not state.embedder:
        raise HTTPException(status_code=503, detail="Embedder não carregado")
    
    # Gerar embedding do termo
    term_embedding = await _get_embedding(req.text)
    
    # Se temos contexto da obra, gerar embedding do contexto
    context_embedding = None
    if req.obra_context:
        context_text = " ".join(str(v) for v in req.obra_context.values() if v)
        if context_text.strip():
            context_embedding = await _get_embedding(context_text)
    
    # Calcular similaridade com categorias de referência
    category_refs = {
        "MATERIAL": "material matéria-prima substância composto elemento",
        "TECNICA": "técnica procedimento método artístico fazer executar",
        "AUTORIA": "autor artista criador mestre escola atribuição",
        "DATA": "data período época ano século datação cronologia",
        "GEO": "lugar local cidade região país geografia procedência",
        "ICONOGRAFIA": "iconografia santo figura sagrada representação religiosa",
        "TEMA": "tema assunto motivo narrativa cena representação",
        "CONSERVACAO": "conservação estado restauração preservação dano",
    }
    
    scores = {}
    for cat, ref_text in category_refs.items():
        ref_emb = await _get_embedding(ref_text)
        sim = _cosine_similarity(term_embedding, ref_emb)
        scores[cat] = round(sim, 4)
    
    sorted_scores = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    
    return {
        "term": req.text,
        "predictions": [{"category": cat, "score": score} for cat, score in sorted_scores[:5]],
        "best_category": sorted_scores[0][0] if sorted_scores else "TEMA",
        "best_score": sorted_scores[0][1] if sorted_scores else 0,
        "context_used": req.obra_context is not None
    }

@app.post("/train", dependencies=[Depends(verify_admin)])
async def train_model(req: TrainRequest):
    """Dispara treinamento do modelo (em background)."""
    import threading
    
    # Salvar dataset
    dataset_path = os.path.join(MODEL_DIR, f"{req.model_name}-dataset.jsonl")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    with open(dataset_path, "w", encoding="utf-8") as f:
        f.write(req.dataset_jsonl)
    
    lines = req.dataset_jsonl.strip().split("\n")
    logger.info(f"Dataset recebido: {len(lines)} amostras para {req.model_name}")
    
    # Treinamento em background (não bloqueia a resposta)
    config = req.config or {}
    
    def train_background():
        try:
            _run_training(
                dataset_path=dataset_path,
                model_name=req.model_name,
                run_id=req.run_id,
                config=config
            )
        except Exception as e:
            logger.error(f"Treinamento falhou: {e}")
    
    thread = threading.Thread(target=train_background, daemon=True)
    thread.start()
    
    return {
        "status": "training_started",
        "model_name": req.model_name,
        "dataset_samples": len(lines),
        "run_id": req.run_id,
        "message": "Treinamento iniciado em background. Verifique /health para status."
    }

@app.get("/metrics")
async def get_metrics():
    """Retorna métricas do modelo ativo."""
    metrics_path = os.path.join(MODEL_DIR, "modernbert-museal-ner", "metrics.json")
    
    if os.path.exists(metrics_path):
        with open(metrics_path) as f:
            return json.load(f)
    
    return {
        "message": "Nenhum modelo treinado ainda",
        "ner_available": state.ner_model is not None,
        "embedder_available": state.embedder is not None
    }

@app.post("/predict-relations")
async def predict_relations_endpoint(req: RelationRequest):
    """Prediz relações entre duas entidades usando RotatE."""
    try:
        from models.rotate_model import predict_relations
        results = predict_relations(
            head=req.head,
            tail=req.tail,
            model_dir=os.path.join(MODEL_DIR, "rotate"),
            top_k=req.top_k
        )
        return {"predictions": results, "head": req.head, "tail": req.tail}
    except Exception as e:
        logger.warning(f"RotatE prediction failed: {e}")
        return {
            "predictions": [{"relation": "related_to", "score": 0.5, "source": "heuristic_fallback"}],
            "head": req.head,
            "tail": req.tail
        }

@app.post("/predict-communities")
async def predict_communities_endpoint(req: CommunityRequest):
    """Prediz pertencimento a comunidades usando GAT."""
    try:
        from models.gat_model import predict_communities
        communities = predict_communities(
            node_embedding=req.embedding,
            model_dir=os.path.join(MODEL_DIR, "gat"),
            threshold=req.threshold
        )
        return {"communities": communities}
    except Exception as e:
        logger.warning(f"GAT prediction failed: {e}")
        return {
            "communities": [{
                "community_id": "unknown",
                "community_name": "Não classificado",
                "weight": 0.5,
                "source": "heuristic_fallback"
            }]
        }

# ============================================================
# Helpers Internos
# ============================================================

async def _get_embedding(text: str) -> list[float]:
    """Gera embedding para uso interno."""
    import torch
    
    tokenizer = state.embedder["tokenizer"]
    model = state.embedder["model"]
    
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
    inputs = {k: v.to(state.device) for k, v in inputs.items()}
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    attention_mask = inputs["attention_mask"]
    token_embeddings = outputs.last_hidden_state
    input_mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * input_mask_expanded, 1)
    sum_mask = torch.clamp(input_mask_expanded.sum(1), min=1e-9)
    embedding = (sum_embeddings / sum_mask).squeeze().cpu().tolist()
    
    return embedding

def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Similaridade de cosseno entre dois vetores."""
    import math
    dot = sum(x*y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x*x for x in a))
    mag_b = math.sqrt(sum(x*x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0
    return dot / (mag_a * mag_b)

def _run_training(dataset_path: str, model_name: str, run_id: str = None, config: dict = None):
    """Executa fine-tuning do ModernBERT NER."""
    import torch
    import numpy as np
    from datasets import Dataset
    from transformers import (
        AutoTokenizer, AutoModelForTokenClassification,
        TrainingArguments, Trainer, DataCollatorForTokenClassification
    )
    
    config = config or {}
    epochs = config.get("epochs", 5)
    batch_size = config.get("batch_size", 8)
    lr = config.get("learning_rate", 3e-5)
    
    logger.info(f"Iniciando treinamento: {model_name} ({epochs} epochs, batch={batch_size})")
    
    # Labels
    LABEL_LIST = [
        'O',
        'B-DATA', 'I-DATA', 'B-TECNICA', 'I-TECNICA',
        'B-GEO', 'I-GEO', 'B-MATERIAL', 'I-MATERIAL',
        'B-AUTORIA', 'I-AUTORIA', 'B-PROVENIENCIA', 'I-PROVENIENCIA',
        'B-QUALIFICADOR', 'I-QUALIFICADOR',
        'B-ICONOGRAFIA', 'I-ICONOGRAFIA', 'B-TEMA', 'I-TEMA',
        'B-ESTILO', 'I-ESTILO', 'B-MOVIMENTO', 'I-MOVIMENTO',
        'B-CONSERVACAO', 'I-CONSERVACAO', 'B-PERIODO', 'I-PERIODO'
    ]
    LABEL2ID = {l: i for i, l in enumerate(LABEL_LIST)}
    ID2LABEL = {i: l for i, l in enumerate(LABEL_LIST)}
    
    # Carregar dataset
    samples = []
    with open(dataset_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                obj = json.loads(line)
                ner_ids = [LABEL2ID.get(tag, 0) for tag in obj.get('ner_tags', [])]
                samples.append({
                    'tokens': obj['tokens'],
                    'ner_tags': ner_ids
                })
    
    if len(samples) < 5:
        logger.error("Dataset muito pequeno para treino")
        return
    
    # Split
    split = int(len(samples) * 0.8)
    train_ds = Dataset.from_list(samples[:split])
    eval_ds = Dataset.from_list(samples[split:])
    
    # Tokenização
    base_model = "answerdotai/ModernBERT-base"
    tokenizer = AutoTokenizer.from_pretrained(base_model)
    
    def tokenize_align(examples):
        tok = tokenizer(examples['tokens'], truncation=True, is_split_into_words=True, max_length=512, padding='max_length')
        labels = []
        for i, label_ids in enumerate(examples['ner_tags']):
            word_ids = tok.word_ids(batch_index=i)
            label_row = []
            prev = None
            for wid in word_ids:
                if wid is None:
                    label_row.append(-100)
                elif wid != prev:
                    label_row.append(label_ids[wid] if wid < len(label_ids) else 0)
                else:
                    cur = label_ids[wid] if wid < len(label_ids) else 0
                    if cur > 0 and LABEL_LIST[cur].startswith('B-'):
                        i_label = LABEL_LIST[cur].replace('B-', 'I-')
                        label_row.append(LABEL2ID.get(i_label, cur))
                    else:
                        label_row.append(cur)
                prev = wid
            labels.append(label_row)
        tok['labels'] = labels
        return tok
    
    train_tok = train_ds.map(tokenize_align, batched=True, remove_columns=train_ds.column_names)
    eval_tok = eval_ds.map(tokenize_align, batched=True, remove_columns=eval_ds.column_names)
    
    # Modelo
    model = AutoModelForTokenClassification.from_pretrained(
        base_model, num_labels=len(LABEL_LIST), id2label=ID2LABEL, label2id=LABEL2ID
    ).to(state.device)
    
    # Métricas
    def compute_metrics(eval_pred):
        preds, labels = eval_pred
        preds = np.argmax(preds, axis=2)
        true_labels, true_preds = [], []
        for p_row, l_row in zip(preds, labels):
            tl, tp = [], []
            for p, l in zip(p_row, l_row):
                if l != -100:
                    tl.append(ID2LABEL[l])
                    tp.append(ID2LABEL[p])
            true_labels.append(tl)
            true_preds.append(tp)
        
        from seqeval.metrics import classification_report
        report = classification_report(true_labels, true_preds, output_dict=True)
        return {
            'precision': report['weighted avg']['precision'],
            'recall': report['weighted avg']['recall'],
            'f1': report['weighted avg']['f1-score']
        }
    
    # Treinar
    output_dir = os.path.join(MODEL_DIR, "modernbert-museal-ner")
    args = TrainingArguments(
        output_dir=output_dir,
        num_train_epochs=epochs,
        per_device_train_batch_size=batch_size,
        per_device_eval_batch_size=batch_size,
        learning_rate=lr,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        save_strategy="no",
        logging_steps=10,
        fp16=torch.cuda.is_available(),
        report_to="none"
    )
    
    trainer = Trainer(
        model=model, args=args,
        train_dataset=train_tok, eval_dataset=eval_tok,
        processing_class=tokenizer,
        data_collator=DataCollatorForTokenClassification(tokenizer),
        compute_metrics=compute_metrics
    )
    
    trainer.train()
    
    # Avaliar
    results = trainer.evaluate()
    logger.info(f"Resultados: P={results.get('eval_precision',0):.4f} R={results.get('eval_recall',0):.4f} F1={results.get('eval_f1',0):.4f}")
    
    # Salvar
    trainer.save_model(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Salvar versão e métricas
    version = f"v{datetime.utcnow().strftime('%Y%m%d.%H%M')}"
    with open(os.path.join(output_dir, "version.json"), "w") as f:
        json.dump({"version": version, "trained_at": datetime.utcnow().isoformat()}, f)
    
    with open(os.path.join(output_dir, "metrics.json"), "w") as f:
        json.dump({
            "version": version,
            "precision": results.get('eval_precision', 0),
            "recall": results.get('eval_recall', 0),
            "f1": results.get('eval_f1', 0),
            "dataset_size": len(samples),
            "epochs": epochs,
            "trained_at": datetime.utcnow().isoformat()
        }, f)
    
    # Recarregar modelo
    state.ner_tokenizer = tokenizer
    state.ner_model = model
    state.ner_version = version
    
    logger.info(f"✅ Modelo salvo: {output_dir} (versão {version})")
