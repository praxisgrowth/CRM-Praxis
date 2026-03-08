-- supabase/project_templates_seed.sql
-- Google Ads Completo — 48 tasks (literal names from spec)
-- Step 1: Insert all rows (no depends_on_id yet)

INSERT INTO project_templates (service_type, task_number, title, type, sla_days, depends_on_task_number) VALUES
('Google Ads Completo',  1, 'Salvar contrato assinado na pasta',                        'Implementação',      1, NULL),
('Google Ads Completo',  2, 'Trocar foto do WhatsApp e sistema',                         'Implementação',      1, NULL),
('Google Ads Completo',  3, 'Inserir Cliente na planilha de vendas offline',              'Implementação',      1, 1),
('Google Ads Completo',  4, 'Agendar reunião de onboarding',                             'Implementação',      1, NULL),
('Google Ads Completo',  5, 'Briefing recebido?',                                        'Implementação',      2, NULL),
('Google Ads Completo',  6, 'Fazer pasta do cliente',                                    'Implementação',      1, NULL),
('Google Ads Completo',  7, 'Salvar briefing na pasta',                                  'Implementação',      1, 5),
('Google Ads Completo',  8, 'Recebimento de fotos',                                      'Implementação',      4, NULL),
('Google Ads Completo',  9, 'Salvar fotos na pasta',                                     'Implementação',      1, 8),
('Google Ads Completo', 10, 'Fazer onboarding com o cliente',                            'Implementação',      4, 4),
('Google Ads Completo', 11, 'Preencher ficha do cliente',                                'Implementação',      1, 10),
('Google Ads Completo', 12, 'Enviar para aprovação resumo onboarding',                   'Implementação',      1, 10),
('Google Ads Completo', 13, 'Enviar Treinamento Vendas',                                 'Implementação',      1, 5),
('Google Ads Completo', 14, 'Comprar domínio na registro br',                            'Implementação',      1, NULL),
('Google Ads Completo', 15, 'Comprar hospedagem da Hostgator',                           'Implementação',      1, NULL),
('Google Ads Completo', 16, 'Inserir compra do cliente no arquivo Compras HostGator',    'Implementação',      2, 15),
('Google Ads Completo', 17, 'Colocar senha da hospedagem na ficha',                      'Implementação',      1, 16),
('Google Ads Completo', 18, 'Avisar Vitor e cliente sobre a hospedagem e prazo de 7 dias','Implementação',     1, 16),
('Google Ads Completo', 19, 'Verificar modelos de site',                                 'Implementação',      1, 14),
('Google Ads Completo', 20, 'Abrir a conta do Google ADS',                               'Implementação',      3, 5),
('Google Ads Completo', 21, 'Colocar a conta dentro do MCC',                             'Implementação',      3, 10),
('Google Ads Completo', 22, 'Verificar se tem campanha antiga rodando e pausar',          'Implementação',      3, 10),
('Google Ads Completo', 23, 'Colocar saldo na conta para aquecer',                       'Implementação',      3, 10),
('Google Ads Completo', 24, 'Fazer verificação do anunciante',                           'Implementação',      3, 10),
('Google Ads Completo', 25, 'Criar e/ou otimizar GMN',                                   'Google Meu Negócio', 5, 5),
('Google Ads Completo', 26, 'Passar a propriedade GMN',                                  'Google Meu Negócio',15, 25),
('Google Ads Completo', 27, 'Acessar a hospedagem e configurar domínio',                 'Site',               2, 16),
('Google Ads Completo', 28, 'Fazer verificação da hospedagem',                           'Site',               2, 16),
('Google Ads Completo', 29, 'Instalar WordPress',                                        'Site',               1, 27),
('Google Ads Completo', 30, 'Adicionar login e senha na ficha do cliente',               'Site',               1, 29),
('Google Ads Completo', 31, 'Construção Landing Page',                                   'Site',               5, 29),
('Google Ads Completo', 32, 'Enviar pra correção',                                       'Site',               1, 31),
('Google Ads Completo', 33, 'Aprovação do cliente',                                      'Site',               5, 32),
('Google Ads Completo', 34, 'Enviar Formulário de Satisfação do Cliente',                'Site',               1, 33),
('Google Ads Completo', 35, 'Instalar na hospedagem',                                    'Site',               1, 33),
('Google Ads Completo', 36, 'Duplicar a página com foto de família/logo na capa.',       'Site',               0, 33),
('Google Ads Completo', 37, 'Avisar na implementação',                                   'Site',               1, 33),
('Google Ads Completo', 38, 'Avisar o cliente que vai começar a programação da campanha','Gestão de Tráfego',  1, 37),
('Google Ads Completo', 39, 'Abrir conta no TAG Manager',                                'Traqueamento',       1, 37),
('Google Ads Completo', 40, 'Instalar TAGs',                                             'Traqueamento',       1, 39),
('Google Ads Completo', 41, 'Checar pela segunda vez com o cliente as informações',      'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 42, 'Verificar se a foto do WhatsApp está correta',              'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 43, 'Verificar todos os botões do WhatsApp',                     'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 44, 'Criar campanha',                                            'Gestão de Tráfego',  1, 40),
('Google Ads Completo', 45, 'Criar lista de exclusão',                                   'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 46, 'Criar recursos na campanha',                                'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 47, 'Avisar para o cliente que a campanha está ativa',           'Gestão de Tráfego',  1, 44),
('Google Ads Completo', 48, 'Remover notificações do cliente',                           'Gestão de Tráfego',  1, 44)
ON CONFLICT (service_type, task_number) DO NOTHING;

-- Step 2: Resolve depends_on_id via self-join
UPDATE project_templates t
SET depends_on_id = d.id
FROM project_templates d
WHERE t.depends_on_task_number IS NOT NULL
  AND d.service_type = t.service_type
  AND d.task_number  = t.depends_on_task_number;
