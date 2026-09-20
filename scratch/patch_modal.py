import os

file_path = 'app/admin/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:291]
new_lines.append('                            <div className="p-4 border border-white/10 bg-white/5 rounded-lg">\n')
new_lines.append('                              <p className="text-xs uppercase font-bold text-white/50 mb-2">Tags neste grupo</p>\n')
new_lines.append('                              <div className="flex flex-wrap gap-2">\n')
new_lines.append('                                {dashboardData?.relatorioSemantico?.recentTags\n')
new_lines.append('                                  ?.filter((t: any) => t.grupo === selectedGroup)\n')
new_lines.append('                                  .map((t: any, i: number) => (\n')
new_lines.append('                                    <span key={i} className="px-2 py-1 bg-white/10 rounded text-xs font-serif italic">"{t.tag}"</span>\n')
new_lines.append('                                  ))}\n')
new_lines.append('                              </div>\n')
new_lines.append('                            </div>\n')
new_lines.extend(lines[300:])

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
