insert into public.plan_catalog (id, name, description, price_cents, features, highlight, is_active, sort_order)
values
('starter','Starter','Para começar a automatizar.',9700,'["1 número WhatsApp","1.000 mensagens/mês","Automações básicas","CRM com até 500 contatos","Suporte por e-mail"]'::jsonb,false,true,1),
('pro','Pro','Para crescer com IA.',24700,'["5 números WhatsApp","Mensagens ilimitadas","Chatbot com IA","CRM ilimitado","Campanhas e segmentação","Suporte prioritário"]'::jsonb,true,true,2),
('business','Business','Para empresas em escala.',49700,'["WhatsApp ilimitado","Automações ilimitadas","Suíte completa de IA","Equipe multi-agente","Acesso à API","Gerente de sucesso dedicado"]'::jsonb,false,true,3)
on conflict (id) do nothing;