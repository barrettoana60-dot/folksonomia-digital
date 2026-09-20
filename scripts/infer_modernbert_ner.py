import sys
import json
import warnings
warnings.filterwarnings("ignore")

try:
    from transformers import AutoTokenizer, AutoModelForTokenClassification
    import torch
except ImportError:
    print(json.dumps({"error": "Bibliotecas não instaladas. Execute pip install transformers torch"}))
    sys.exit(1)

MODEL_DIR = "./modernbert-museal-ner-final"

def classify(text):
    try:
        # Tenta carregar o modelo treinado
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
    except Exception as e:
        print(json.dumps({"error": "Modelo não encontrado. Treine o modelo primeiro."}))
        sys.exit(1)

    inputs = tokenizer(text, return_tensors="pt", truncation=True, max_length=512)
    with torch.no_grad():
        outputs = model(**inputs)

    predictions = torch.argmax(outputs.logits, dim=2)
    predicted_token_class = [model.config.id2label[t.item()] for t in predictions[0]]
    
    tokens = tokenizer.convert_ids_to_tokens(inputs["input_ids"][0])
    
    results = []
    # Alinha os tokens e os sub-tokens
    current_word = ""
    current_label = "O"
    
    for token, label in zip(tokens, predicted_token_class):
        if token in ["[CLS]", "[SEP]", "[PAD]"]:
            continue
            
        # ModernBERT (ou RoBERTa) tokenization prefixa com Ġ
        if token.startswith("Ġ"):
            if current_word:
                results.append({"token": current_word.replace("Ġ", ""), "category": current_label.replace("B-", "").replace("I-", "")})
            current_word = token
            current_label = label
        else:
            current_word += token
            if current_label == "O" and label != "O":
                current_label = label
                
    if current_word:
         results.append({"token": current_word.replace("Ġ", ""), "category": current_label.replace("B-", "").replace("I-", "")})

    return results

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Nenhum texto fornecido"}))
        sys.exit(1)
        
    text = sys.argv[1]
    results = classify(text)
    print(json.dumps({"tokens": results}))
