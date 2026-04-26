-- Seed Obras
INSERT INTO obras (titulo, artista, ano, tipo, descricao) VALUES 
('Guernica', 'Pablo Picasso', '1937', 'Pintura', 'Uma das obras mais famosas de Picasso, retratando o bombardeio de Guernica durante a Guerra Civil Espanhola.'),
('A Noite Estrelada', 'Vincent van Gogh', '1889', 'Pintura', 'Obra-prima do pós-impressionismo, retratando a vista da janela do asilo de Van Gogh em Saint-Rémy-de-Provence.'),
('Mona Lisa', 'Leonardo da Vinci', '1503', 'Pintura', 'O retrato mais famoso do mundo, conhecido pelo sorriso enigmático da modelo.'),
('Escultura Mãe e Filho', 'Artista Institucional', '1950', 'Escultura', 'Representação clássica do vínculo maternal e cuidado.'),
('Objeto Museológico Experimental', 'Curadoria Digital', '2024', 'Mídia Digital', 'Objeto de teste para validação de fluxos semânticos e interoperabilidade.');

-- Seed Ontologias
INSERT INTO ontologias (nome, categoria, descricao, termos) VALUES 
('Religioso', 'Temático', 'Conceitos ligados à religiosidade e fé.', '{fé, sagrado, oração, divindade}'),
('Guerra', 'Histórico', 'Conceitos ligados a conflitos e batalhas.', '{combate, destruição, exército, paz}'),
('Cor', 'Estético', 'Atributos cromáticos das obras.', '{vermelho, azul, vibrante, sombrio}'),
('Natureza', 'Temático', 'Elementos do mundo natural.', '{árvore, mar, céu, animal}'),
('Corpo', 'Anatômico', 'Representações da figura humana.', '{rosto, mãos, gesto, movimento}'),
('Afeto', 'Psicológico', 'Expressões de sentimentos e emoções.', '{amor, tristeza, alegria, medo}'),
('Família', 'Social', 'Relações de parentesco e convivência.', '{pai, mãe, filho, casa}'),
('Memória', 'Histórico', 'Preservação do passado e lembranças.', '{passado, arquivo, saudade, registro}'),
('Maternidade', 'Social', 'Conceitos ligados ao ato de ser mãe.', '{mãe, cuidado, amamentação, proteção}'),
('Cuidado', 'Social', 'Ações de zelo e atenção.', '{proteção, ajuda, atenção, zelo}'),
('Materialidade', 'Técnico', 'Atributos físicos do objeto.', '{madeira, metal, pedra, tecido}'),
('Técnica', 'Técnico', 'Modos de fazer e produzir.', '{óleo, cinzel, moldagem, fotografia}');

-- Seed Fontes Externas
INSERT INTO fontes_externas (nome, url, endpoint, tipo, descricao) VALUES 
('Europeana', 'https://www.europeana.eu', 'https://api.europeana.eu/record/v2/search.json', 'Open Data', 'Portal europeu de patrimônio cultural.'),
('Brasiliana Museus', 'https://brasilianamuseus.cultura.gov.br', 'https://brasilianamuseus.cultura.gov.br/wp-json/tainacan/v2/items', 'Open Data', 'Agregador de acervos museológicos brasileiros.'),
('Brasiliana Fotográfica', 'https://brasilianafotografica.bn.gov.br', 'https://brasilianafotografica.bn.gov.br/api', 'Open Data', 'Portal de fotografia histórica brasileira.'),
('IBRAM Dados Abertos', 'https://dados.museus.gov.br', 'https://dados.museus.gov.br/api/3/action', 'Open Data', 'Plataforma de dados abertos do Instituto Brasileiro de Museus.'),
('Portal Brasileiro de Dados Abertos', 'https://dados.gov.br', 'https://dados.gov.br/api/3/action', 'Open Data', 'Infraestrutura Nacional de Dados Abertos (INDA).'),
('Tainacan API', 'https://tainacan.org', '', 'Protocolo', 'API padrão para repositórios culturais digitais.');
