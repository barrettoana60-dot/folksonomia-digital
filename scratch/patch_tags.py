import os

file_path = 'app/admin/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = lines[:258]
new_lines.append('                        {/* Dinâmico: tags recentes da API */}\n')
new_lines.append('                        {dashboardData?.relatorioSemantico?.recentTags?.length > 0 ? (\n')
new_lines.append('                          dashboardData.relatorioSemantico.recentTags.map((tagObj: any, i: number) => (\n')
new_lines.append('                            <div key={tagObj.id || i} className="p-4 bg-white/5 rounded-lg border border-white/10 flex justify-between items-center">\n')
new_lines.append('                              <div>\n')
new_lines.append('                                <div className="flex items-center gap-2">\n')
new_lines.append('                                  <span className="text-[#E85002] font-serif italic text-lg">"{tagObj.tag}"</span>\n')
new_lines.append('                                </div>\n')
new_lines.append('                                <p className="text-[10px] uppercase tracking-widest font-bold text-white/40 mt-1">\n')
new_lines.append('                                  Agrupado como: {tagObj.grupo}\n')
new_lines.append('                                </p>\n')
new_lines.append('                              </div>\n')
new_lines.append('                              <button onClick={() => setSelectedGroup(tagObj.grupo)} className="px-3 py-1 bg-white/10 hover:bg-[#E85002] transition-colors rounded text-[9px] uppercase font-bold">Ver Grupo</button>\n')
new_lines.append('                            </div>\n')
new_lines.append('                          ))\n')
new_lines.append('                        ) : (\n')
new_lines.append('                          <div className="p-4 text-center text-white/40 text-[10px] uppercase tracking-widest border border-white/5 rounded-lg">\n')
new_lines.append('                            Nenhuma tag criada ainda\n')
new_lines.append('                          </div>\n')
new_lines.append('                        )}\n')
new_lines.extend(lines[282:])

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
