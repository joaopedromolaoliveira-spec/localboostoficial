export const PLANS = [
  {
    id: "starter",
    name: "Starter",
    price: 97,
    description: "Para começar a automatizar.",
    features: [
      "1 número WhatsApp",
      "1.000 mensagens/mês",
      "Automações básicas",
      "CRM com até 500 contatos",
      "Suporte por e-mail",
    ],
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: 247,
    description: "Para crescer com IA.",
    features: [
      "5 números WhatsApp",
      "Mensagens ilimitadas",
      "Chatbot com IA",
      "CRM ilimitado",
      "Campanhas e segmentação",
      "Suporte prioritário",
    ],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: 497,
    description: "Para empresas em escala.",
    features: [
      "WhatsApp ilimitado",
      "Automações ilimitadas",
      "Suíte completa de IA",
      "Equipe multi-agente",
      "Acesso à API",
      "Gerente de sucesso dedicado",
    ],
    highlight: false,
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
