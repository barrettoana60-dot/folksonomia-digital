-- Obras
INSERT INTO obras (titulo, artista, ano, tipo, descricao, publicado) VALUES
('Guernica', 'Pablo Picasso', '1937', 'Pintura', 'Pintura monumental associada à guerra civil espanhola.', true),
('A Noite Estrelada', 'Vincent van Gogh', '1889', 'Pintura', 'Paisagem noturna com cipreste e vilarejo.', true),
('Mona Lisa', 'Leonardo da Vinci', '1503', 'Pintura', 'Retrato renascentista.', true),
('Escultura Mãe e Filho', 'Desconhecido', '1920', 'Escultura', 'Escultura representando afeto e maternidade.', true),
('Objeto Museológico Experimental', 'Sistema Folksonomia', '2026', 'Instalação', 'Objeto de estudo semântico.', true);

-- Fontes Externas (Sem Wikidata)
INSERT INTO fontes_externas (nome, url, endpoint, tipo, licenca) VALUES
('Europeana', 'https://pro.europeana.eu', 'https://api.europeana.eu/record/v2/search.json', 'Agregador', 'Mista'),
('Brasiliana Museus', 'https://brasiliana.museus.gov.br', 'https://brasiliana.museus.gov.br/api/items', 'Acervo', 'Aberta'),
('Brasiliana Fotográfica', 'https://brasilianafotografica.bn.gov.br', 'https://brasilianafotografica.bn.gov.br/api', 'Acervo Fotográfico', 'Aberta'),
('IBRAM Dados Abertos', 'https://dados.gov.br', 'https://dados.gov.br/api/3/action/package_search', 'Dados Governamentais', 'Aberta'),
('Portal Brasileiro de Dados Abertos', 'https://dados.gov.br', 'https://dados.gov.br/api/3/action/package_search', 'Dados Governamentais', 'Aberta'),
('Tainacan API', 'https://tainacan.org', '/wp-json/tainacan/v2/items', 'Repositório', 'Aberta');

-- Núcleos Base (Conceitos)
-- Não preenchemos embeddings aqui pois o seed SQL não passa pela engine de ML do Node.
INSERT INTO nucleos (tipo, conteudo_original, conteudo_normalizado, status_validacao) VALUES
('conceito', 'Mãe', 'mae', 'validado'),
('conceito', 'Maternidade', 'maternidade', 'validado'),
('conceito', 'Cuidado', 'cuidado', 'validado'),
('conceito', 'Família', 'familia', 'validado'),
('conceito', 'Afeto', 'afeto', 'validado'),
('conceito', 'Memória', 'memoria', 'validado'),
('conceito', 'Corpo', 'corpo', 'validado'),
('conceito', 'Escultura', 'escultura', 'validado'),
('conceito', 'Guerra', 'guerra', 'validado'),
('conceito', 'Religiosidade', 'religiosidade', 'validado'),
('conceito', 'Cor', 'cor', 'validado'),
('conceito', 'Técnica', 'tecnica', 'validado'),
('conceito', 'Materialidade', 'materialidade', 'validado');
