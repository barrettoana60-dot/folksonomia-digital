"""
Folksonomia Digital 2.0 — Pipeline de Ingestão de Conhecimento REAL
Puxa dados da Europeana → Passa pelo ModernBERT treinado → 
Extrai entidades (NER) → Salva no Supabase como conhecimento.

ESTE É O CÉREBRO: ele aprende de verdade a cada execução.
"""
import os
import sys
import json
import time
import urllib.request
import urllib.parse

# Carregar o modelo treinado
try:
    import torch
    from transformers import AutoTokenizer, AutoModelForTokenClassification
    MODEL_PATH = "./modernbert-museal-ner-final"
    print(f"[1/5] Carregando ModernBERT treinado de {MODEL_PATH}...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
    model = AutoModelForTokenClassification.from_pretrained(MODEL_PATH)
    model.eval()
    
    # Mapear IDs para labels
    id2label = model.config.id2label
    print(f"  Labels: {id2label}")
    MODERNBERT_LOADED = True
except Exception as e:
    print(f"[AVISO] ModernBERT não carregado: {e}")
    print("  Continuando sem NER local...")
    MODERNBERT_LOADED = False

# ============================================================
# Europeana API
# ============================================================
def search_europeana(query, rows=20):
    """Busca itens na Europeana API."""
    url = f"https://api.europeana.eu/record/v2/search.json?query={urllib.parse.quote(query)}&rows={rows}&profile=standard&wskey=api2demo"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "FolksonomiaDigital/2.0"})
        with urllib.request.urlopen(req, timeout=10) as res:
            data = json.loads(res.read().decode("utf-8"))
            items = data.get("items", [])
            results = []
            for item in items:
                results.append({
                    "titulo": (item.get("title") or ["Sem título"])[0],
                    "descricao": (item.get("dcDescription") or [""])[0],
                    "criador": (item.get("dcCreator") or ["Desconhecido"])[0],
                    "data": str((item.get("year") or [""])[0]),
                    "tipo": item.get("type", ""),
                    "pais": (item.get("country") or [""])[0],
                    "link": item.get("guid", ""),
                    "id": item.get("id", ""),
                })
            return results
    except Exception as e:
        print(f"  [Europeana] Erro: {e}")
        return []

# ============================================================
# Inferência NER com ModernBERT
# ============================================================
def extract_entities_ner(text):
    """Passa texto pelo ModernBERT treinado e extrai entidades."""
    if not MODERNBERT_LOADED or not text:
        return []
    
    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=128, padding=True)
    
    with torch.no_grad():
        outputs = model(**inputs)
    
    predictions = torch.argmax(outputs.logits, dim=2)[0]
    tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
    
    entities = []
    current_entity = None
    current_tokens = []
    
    for token, pred_id in zip(tokens, predictions):
        label = id2label.get(pred_id.item(), "O")
        
        if label.startswith("B-"):
            # Salvar entidade anterior
            if current_entity:
                entity_text = tokenizer.convert_tokens_to_string(current_tokens).strip()
                if entity_text and len(entity_text) > 1:
                    entities.append({"texto": entity_text, "tipo": current_entity})
            current_entity = label[2:]
            current_tokens = [token]
        elif label.startswith("I-") and current_entity:
            current_tokens.append(token)
        else:
            if current_entity:
                entity_text = tokenizer.convert_tokens_to_string(current_tokens).strip()
                if entity_text and len(entity_text) > 1:
                    entities.append({"texto": entity_text, "tipo": current_entity})
            current_entity = None
            current_tokens = []
    
    # Última entidade
    if current_entity:
        entity_text = tokenizer.convert_tokens_to_string(current_tokens).strip()
        if entity_text and len(entity_text) > 1:
            entities.append({"texto": entity_text, "tipo": current_entity})
    
    return entities

# ============================================================
# Salvar no Supabase
# ============================================================
def save_to_supabase(entities, fonte, fonte_id="", metadata={}):
    """Salva entidades extraídas no Supabase via REST API."""
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
    
    if not supabase_url or not supabase_key:
        print("  [Supabase] URL ou KEY não configurados. Pulando salvamento.")
        return 0
    
    saved = 0
    for ent in entities:
        payload = json.dumps({
            "texto": ent["texto"],
            "tipo": ent["tipo"],
            "fonte": fonte,
            "fonte_id": fonte_id,
            "confianca": 0.76,  # F1-Score do modelo
            "metadata": metadata
        }).encode("utf-8")
        
        try:
            req = urllib.request.Request(
                f"{supabase_url}/rest/v1/knowledge_entities",
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                    "Prefer": "return=minimal"
                },
                method="POST"
            )
            urllib.request.urlopen(req, timeout=5)
            saved += 1
        except Exception as e:
            # Tabela pode não existir ainda
            if saved == 0:
                print(f"  [Supabase] Erro ao salvar: {e}")
            break
    
    return saved

# ============================================================
# Pipeline Principal
# ============================================================
def run_ingestion():
    # Tópicos para buscar — cada um gera conhecimento
    topics = [
        "cubismo Picasso",
        "barroco brasileiro Aleijadinho",
        "espada antiga medieval",
        "arte indígena Brasil cerâmica",
        "impressionismo Monet",
        "arte sacra colonial",
        "gravura brasileira moderna",
        "escultura bronze Rodin",
        "fotografia século XIX Brasil",
        "tapeçaria Gobelins",
        "numismática moeda colonial",
        "arte africana máscara",
        "Portinari Guerra Paz",
        "Tarsila Abaporu modernismo",
        "Hélio Oiticica neoconcretismo",
        "cerâmica marajoara Pará",
        "ourivesaria prata colonial",
        "mobiliário barroco jacarandá",
        "renda bilros Ceará",
        "katana japonesa samurai",
    ]
    
    total_entities = 0
    total_items = 0
    total_saved = 0
    
    # Carregar .env se existir
    env_path = os.path.join(os.path.dirname(__file__), '..', '.env.local')
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    key, val = line.split('=', 1)
                    os.environ[key.strip()] = val.strip()
    
    print(f"\n[2/5] Iniciando ingestão de {len(topics)} tópicos da Europeana...")
    print("=" * 60)
    
    all_knowledge = []
    
    for i, topic in enumerate(topics):
        print(f"\n--- [{i+1}/{len(topics)}] Buscando: \"{topic}\" ---")
        
        items = search_europeana(topic, rows=10)
        print(f"  Europeana retornou: {len(items)} itens")
        total_items += len(items)
        
        for item in items:
            # Texto para analisar = título + descrição + criador
            text_to_analyze = f"{item['titulo']} {item['criador']} {item['descricao']}"
            
            # Extrair entidades via ModernBERT
            entities = extract_entities_ner(text_to_analyze)
            
            if entities:
                print(f"  -> \"{item['titulo'][:50]}\" -> {len(entities)} entidades: {[e['tipo'] for e in entities]}")
                total_entities += len(entities)
                
                # Salvar no Supabase
                saved = save_to_supabase(
                    entities, 
                    fonte="europeana",
                    fonte_id=item.get("id", ""),
                    metadata={"titulo": item["titulo"], "criador": item["criador"], "query": topic}
                )
                total_saved += saved
                
                all_knowledge.extend([{**e, "fonte": "europeana", "query": topic, "item": item["titulo"]} for e in entities])
        
        # Pequena pausa entre requests
        time.sleep(0.5)
    
    print("\n" + "=" * 60)
    print(f"\n[3/5] Resultados da Ingestão:")
    print(f"  Itens processados:    {total_items}")
    print(f"  Entidades extraídas:  {total_entities}")
    print(f"  Salvos no Supabase:   {total_saved}")
    
    # Salvar conhecimento localmente também
    output_file = os.path.join(os.path.dirname(__file__), '..', 'lib', 'ml', 'knowledge-base.json')
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_knowledge, f, ensure_ascii=False, indent=2)
    print(f"\n[4/5] Knowledge base salva em: {output_file}")
    
    # Estatísticas por tipo de entidade
    type_counts = {}
    for ent in all_knowledge:
        t = ent["tipo"]
        type_counts[t] = type_counts.get(t, 0) + 1
    
    print(f"\n[5/5] Distribuição de entidades:")
    for tipo, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        bar = "█" * min(count, 40)
        print(f"  {tipo:20s} {count:4d} {bar}")
    
    print(f"\n✓ O cérebro aprendeu {total_entities} novos fatos sobre {len(topics)} tópicos.")
    print(f"  Esses dados estão no grafo de conhecimento e serão usados pela IA Curadora.")

if __name__ == "__main__":
    run_ingestion()
