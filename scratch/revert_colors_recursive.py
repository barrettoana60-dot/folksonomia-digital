import os

replacements = [
    # Emerald to Orange
    ('#10B981', '#E85002'),
    ('#0d9488', '#F16001'),
    ('10B981', 'E85002'),
    ('0d9488', 'F16001'),
    
    # Darker Green to Darker Orange
    ('#059669', '#d95204'),
    ('059669', 'd95204'),
    ('#047857', '#c44000'),
    ('047857', 'c44000'),
    
    # Tailwind classes
    ('text-green-400', 'text-orange-400'),
    ('text-green-500', 'text-orange-500'),
    ('bg-green-400', 'bg-orange-400'),
    ('bg-green-500', 'bg-orange-500'),
    ('bg-green-600', 'bg-orange-600'),
    ('border-green-400', 'border-orange-400'),
    ('border-green-500', 'border-orange-500'),
    ('text-emerald-400', 'text-orange-400'),
    ('text-emerald-500', 'text-orange-500'),
    ('bg-emerald-400', 'bg-orange-400'),
    ('bg-emerald-500', 'bg-orange-500'),
    ('border-emerald-500', 'border-orange-500'),
    
    ('text-teal-400', 'text-amber-400'),
    ('text-teal-500', 'text-amber-500'),
    ('bg-teal-400', 'bg-amber-400'),
    ('bg-teal-500', 'bg-amber-500'),
    ('border-teal-500', 'border-amber-500'),
    
    # Backgrounds
    ('#060a08', '#000000'),
    ('#030806', '#000000'),
    ('#0c1a15', '#111111'),
    ('#f2f7f5', '#f5f5f5'),
    
    # RGBA strings
    ('rgba(16, 185, 129', 'rgba(232, 80, 2'),
    ('rgba(16,185,129', 'rgba(232,80,2'),
    ('rgba(13, 148, 136', 'rgba(241, 96, 1'),
    ('rgba(13,148,136', 'rgba(241,96,1'),
    ('rgba(6, 20, 16', 'rgba(255, 255, 255'),
]

directories = ['app', 'components']
base_dir = r"c:\Users\senho\Downloads\folksonomia2.0"

for folder in directories:
    dir_path = os.path.join(base_dir, folder)
    for root, dirs, files in os.walk(dir_path):
        for file in files:
            if file.endswith(('.tsx', '.ts', '.css')):
                full_path = os.path.join(root, file)
                try:
                    with open(full_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    original = content
                    for old, new in replacements:
                        content = content.replace(old, new)
                    
                    if content != original:
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        print(f"Updated: {full_path}")
                except Exception as e:
                    print(f"Error processing {full_path}: {e}")

print("Reversion complete!")
