import os

replacements = [
    ('#E85002', '#10B981'),
    ('#F16001', '#0d9488'),
    ('E85002', '10B981'),
    ('F16001', '0d9488'),
    ('#c44000', '#047857'),
    ('c44000', '047857'),
    ('rgba(232, 80, 2', 'rgba(16, 185, 129'),
    ('rgba(232,80,2', 'rgba(16,185,129'),
    ('rgba(241, 96, 1', 'rgba(13, 148, 136'),
    ('rgba(241,96,1', 'rgba(13,148,136'),
]

files_to_process = [
    r"app/admin/page.tsx",
    r"app/admin/modelos/page.tsx",
    r"app/admin/obras/page.tsx",
    r"app/admin/tags/page.tsx",
    r"app/admin/teia/page.tsx",
    r"app/admin/validacao/page.tsx",
    r"app/admin/ontologias/page.tsx",
    r"app/admin/interoperabilidade/page.tsx",
    r"app/admin/relatorios/page.tsx",
    r"app/admin/eventos/page.tsx",
    r"app/admin/fontes/page.tsx",
    r"components/AIChatBot.tsx",
    r"components/IACuradora.tsx"
]

base_dir = r"c:\Users\senho\Downloads\folksonomia2.0"

for rel_path in files_to_process:
    full_path = os.path.join(base_dir, rel_path)
    if not os.path.exists(full_path):
        print(f"File not found: {full_path}")
        continue
        
    print(f"Processing {rel_path}...")
    with open(full_path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
        
    if content != original:
        with open(full_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"  Updated!")
    else:
        print(f"  No changes.")

print("Done!")
