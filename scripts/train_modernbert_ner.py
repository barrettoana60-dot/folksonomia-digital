# ==============================================================
# Folksonomia Digital 2.0 — Fine-Tuning ModernBERT para NER Museal
#
# Execute este script no Google Colab com GPU habilitada.
# Runtime > Change runtime type > GPU (T4 ou superior)
#
# Passo 1: Coletar o dataset JSONL via API:
#   GET https://seu-site.vercel.app/api/ml/collect-training-data
#   Salvar como 'folksonomia-ner-dataset.jsonl'
#
# Passo 2: Upload do arquivo para o Colab
# Passo 3: Executar este script
# ==============================================================

# !pip install transformers datasets torch accelerate seqeval

import json
import torch
import numpy as np
from datasets import Dataset, DatasetDict
from transformers import (
    AutoTokenizer,
    AutoModelForTokenClassification,
    TrainingArguments,
    Trainer,
    DataCollatorForTokenClassification
)
from seqeval.metrics import classification_report

# ==============================================================
# Configuração de Labels
# ==============================================================

LABEL_LIST = [
    'O',
    'B-DATA', 'I-DATA',
    'B-TECNICA', 'I-TECNICA',
    'B-GEO', 'I-GEO',
    'B-MATERIAL', 'I-MATERIAL',
    'B-AUTORIA', 'I-AUTORIA',
    'B-PROVENIENCIA', 'I-PROVENIENCIA',
    'B-QUALIFICADOR', 'I-QUALIFICADOR'
]

LABEL2ID = {label: i for i, label in enumerate(LABEL_LIST)}
ID2LABEL = {i: label for i, label in enumerate(LABEL_LIST)}

# ==============================================================
# Carregar Dataset
# ==============================================================

def load_dataset_from_jsonl(path):
    """Carrega o dataset JSONL gerado pela API /api/ml/collect-training-data"""
    samples = []
    with open(path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                obj = json.loads(line)
                # Converter labels string para IDs
                ner_tag_ids = [LABEL2ID.get(tag, 0) for tag in obj['ner_tags']]
                samples.append({
                    'id': obj['id'],
                    'tokens': obj['tokens'],
                    'ner_tags': ner_tag_ids
                })
    return samples

# ==============================================================
# Tokenização Alinhada com Labels
# ==============================================================

MODEL_NAME = "answerdotai/ModernBERT-base"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize_and_align_labels(examples):
    """
    Tokeniza os exemplos e alinha os labels com os sub-tokens.
    ModernBERT pode quebrar uma palavra em múltiplos sub-tokens;
    precisamos propagar o label para cada um deles.
    """
    tokenized = tokenizer(
        examples['tokens'],
        truncation=True,
        is_split_into_words=True,
        max_length=512,
        padding='max_length'
    )

    labels = []
    for i, label_ids in enumerate(examples['ner_tags']):
        word_ids = tokenized.word_ids(batch_index=i)
        label_row = []
        prev_word_id = None

        for word_id in word_ids:
            if word_id is None:
                label_row.append(-100)  # tokens especiais
            elif word_id != prev_word_id:
                label_row.append(label_ids[word_id] if word_id < len(label_ids) else 0)
            else:
                # Sub-token: propagar o I- label correspondente
                current_label = label_ids[word_id] if word_id < len(label_ids) else 0
                if current_label > 0 and LABEL_LIST[current_label].startswith('B-'):
                    # Converter B- para I-
                    i_label = LABEL_LIST[current_label].replace('B-', 'I-')
                    label_row.append(LABEL2ID.get(i_label, current_label))
                else:
                    label_row.append(current_label)
            prev_word_id = word_id

        labels.append(label_row)

    tokenized['labels'] = labels
    return tokenized

# ==============================================================
# Métricas
# ==============================================================

def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = np.argmax(predictions, axis=2)

    true_labels = []
    true_preds = []

    for pred_row, label_row in zip(predictions, labels):
        true_label = []
        true_pred = []
        for p, l in zip(pred_row, label_row):
            if l != -100:
                true_label.append(ID2LABEL[l])
                true_pred.append(ID2LABEL[p])
        true_labels.append(true_label)
        true_preds.append(true_pred)

    report = classification_report(true_labels, true_preds, output_dict=True)
    return {
        'precision': report['weighted avg']['precision'],
        'recall': report['weighted avg']['recall'],
        'f1': report['weighted avg']['f1-score']
    }

# ==============================================================
# Pipeline Principal
# ==============================================================

def main():
    print("=" * 60)
    print("Folksonomia Digital 2.0 — ModernBERT NER Training")
    print("=" * 60)

    # 1. Carregar dados
    print("\n[1/5] Carregando dataset...")
    raw_samples = load_dataset_from_jsonl('folksonomia-ner-dataset.jsonl')
    print(f"    Total de amostras: {len(raw_samples)}")

    # 2. Criar splits train/eval (80/20)
    split = int(len(raw_samples) * 0.8)
    train_data = raw_samples[:split]
    eval_data = raw_samples[split:]

    train_dataset = Dataset.from_list(train_data)
    eval_dataset = Dataset.from_list(eval_data)

    print(f"    Train: {len(train_data)}, Eval: {len(eval_data)}")

    # 3. Tokenizar
    print("\n[2/5] Tokenizando com ModernBERT tokenizer...")
    train_tokenized = train_dataset.map(
        tokenize_and_align_labels,
        batched=True,
        remove_columns=train_dataset.column_names
    )
    eval_tokenized = eval_dataset.map(
        tokenize_and_align_labels,
        batched=True,
        remove_columns=eval_dataset.column_names
    )

    # 4. Modelo
    print("\n[3/5] Carregando ModernBERT-base...")
    model = AutoModelForTokenClassification.from_pretrained(
        MODEL_NAME,
        num_labels=len(LABEL_LIST),
        id2label=ID2LABEL,
        label2id=LABEL2ID
    )

    # 5. Treinamento
    print("\n[4/5] Iniciando fine-tuning...")
    training_args = TrainingArguments(
        output_dir="./modernbert-museal-ner",
        num_train_epochs=10,
        per_device_train_batch_size=8,
        per_device_eval_batch_size=8,
        learning_rate=3e-5,
        weight_decay=0.01,
        warmup_ratio=0.1,
        eval_strategy="epoch",
        save_strategy="epoch",
        load_best_model_at_end=True,
        metric_for_best_model="f1",
        logging_steps=10,
        fp16=torch.cuda.is_available(),
        report_to="none"
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_tokenized,
        eval_dataset=eval_tokenized,
        tokenizer=tokenizer,
        data_collator=DataCollatorForTokenClassification(tokenizer),
        compute_metrics=compute_metrics
    )

    trainer.train()

    # 6. Salvar modelo
    print("\n[5/5] Salvando modelo treinado...")
    trainer.save_model("./modernbert-museal-ner-final")
    tokenizer.save_pretrained("./modernbert-museal-ner-final")

    # 7. Avaliar
    results = trainer.evaluate()
    print("\n" + "=" * 60)
    print("RESULTADOS FINAIS:")
    print(f"  Precision: {results.get('eval_precision', 0):.4f}")
    print(f"  Recall:    {results.get('eval_recall', 0):.4f}")
    print(f"  F1-Score:  {results.get('eval_f1', 0):.4f}")
    print("=" * 60)

    print("\nModelo salvo em: ./modernbert-museal-ner-final/")
    print("Próximo passo: exportar para ONNX e deploy no Fly.io")

if __name__ == '__main__':
    main()
