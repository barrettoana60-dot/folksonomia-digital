$url = "https://miicyiykbdsdhrjautpy.supabase.co/rest/v1/fontes_externas"
$headers = @{
    "apikey" = "sb_publishable_4ffRXusg_g6kRbFBFGARFg_dU3lLkSE"
    "Authorization" = "Bearer sb_publishable_4ffRXusg_g6kRbFBFGARFg_dU3lLkSE"
    "Content-Type" = "application/json"
    "Prefer" = "resolution=merge-duplicates"
}

$body = @(
  @{
    nome = 'Museu de Arte Religiosa e Tradicional (MART)'
    tipo = 'Tainacan / json-flat'
    descricao = 'Acervo focado em arte sacra, cultura popular e tradições da Região dos Lagos.'
    licenca = 'Domínio Público / Creative Commons'
    url = 'https://museudeartereligiosaetradicional.acervos.museus.gov.br'
    ativo = $true
  },
  @{
    nome = 'Museu Regional de Caeté'
    tipo = 'Tainacan / json-flat'
    descricao = 'Acervo com foco em cultura popular, tradições locais, saberes e fazeres.'
    licenca = 'Domínio Público / Creative Commons'
    url = 'https://museuregionaldecaete.acervos.museus.gov.br'
    ativo = $true
  },
  @{
    nome = 'Museu de Arqueologia de Itaipu'
    tipo = 'Tainacan / json-flat'
    descricao = 'Acervo focado em cultura popular, território e arqueologia.'
    licenca = 'Domínio Público / Creative Commons'
    url = 'http://museudearqueologiadeitaipu.museus.gov.br'
    ativo = $true
  },
  @{
    nome = 'Museu da Abolição'
    tipo = 'Tainacan / json-flat'
    descricao = 'Acervo sobre memória afro-brasileira, escravidão e resistência.'
    licenca = 'Domínio Público / Creative Commons'
    url = 'https://museudaabolicao.acervos.museus.gov.br'
    ativo = $true
  },
  @{
    nome = 'Museu do Diamante'
    tipo = 'Tainacan / json-flat'
    descricao = 'Acervo focado em cultura material, mineração e técnicas.'
    licenca = 'Domínio Público / Creative Commons'
    url = 'http://museudodiamante.acervos.museus.gov.br'
    ativo = $true
  }
) | ConvertTo-Json -Depth 10 -Compress

$body = $body -replace "\\u([0-9a-fA-F]{4})", { [char][int]"0x$($args[0].Groups[1].Value)" }

Invoke-RestMethod -Uri "$url`?on_conflict=url" -Method Post -Headers $headers -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
