import json

data = [
    {
        "id": "eu-1",
        "tokens": ["Pintura", "a", "óleo", "sobre", "tela", "do", "século", "XVIII", "do", "Brasil"],
        "ner_tags": ["O", "O", "B-TECNICA", "I-TECNICA", "I-TECNICA", "O", "B-DATA", "I-DATA", "O", "B-GEO"]
    },
    {
        "id": "eu-2",
        "tokens": ["Cálice", "de", "prata", "com", "talha", "dourada", "de", "Minas", "Gerais"],
        "ner_tags": ["O", "O", "B-MATERIAL", "O", "B-TECNICA", "I-TECNICA", "O", "B-GEO", "I-GEO"]
    },
    {
        "id": "eu-3",
        "tokens": ["Atribuído", "a", "Aleijadinho", "coleção", "do", "Museu", "Histórico", "Nacional"],
        "ner_tags": ["B-QUALIFICADOR", "I-QUALIFICADOR", "B-AUTORIA", "B-PROVENIENCIA", "I-PROVENIENCIA", "I-PROVENIENCIA", "I-PROVENIENCIA", "I-PROVENIENCIA"]
    }
]

# Create 100 samples by repeating the data
samples = (data * 34)[:100]

with open("folksonomia-ner-dataset.jsonl", "w", encoding="utf-8") as f:
    for s in samples:
        f.write(json.dumps(s) + "\n")

print("Mock dataset created.")
