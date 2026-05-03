import json
with open('lib/ml/knowledge-base.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
with open('lib/ml/knowledge-base.ts', 'w', encoding='utf-8') as f:
    f.write('export const kbData = ')
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write(';\n')
