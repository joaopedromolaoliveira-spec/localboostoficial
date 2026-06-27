import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { PLANS } from "@/constants/plans";
import {
  MessageSquare, Bot, Users, BarChart3, Zap, Shield, Check, Star,
  Sparkles, ArrowRight, Smartphone, Calendar, Send, Megaphone
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalBoost — Automação WhatsApp para negócios locais" },
      { name: "description", content: "Transforme conversas em clientes. CRM, chatbot com IA, campanhas e automação completa do WhatsApp para restaurantes, lojas, salões, clínicas e mais." },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: MessageSquare, title: "Automação WhatsApp", desc: "Conecte via QR Code e automatize respostas, lembretes e follow-ups." },
  { icon: Bot, title: "Chatbot com IA", desc: "Atendimento 24/7, qualifica leads e responde dúvidas com inteligência." },
  { icon: Users, title: "CRM completo", desc: "Contatos, tags, pipeline de vendas e histórico de cada cliente." },
  { icon: Megaphone, title: "Campanhas em massa", desc: "Segmente sua audiência e envie promoções com métricas em tempo real." },
  { icon: Calendar, title: "Mensagens agendadas", desc: "Programe lembretes de agendamento, aniversários e ofertas." },
  { icon: BarChart3, title: "Relatórios e análises", desc: "Acompanhe receita, conversão e engajamento. Exporte em PDF/Excel." },
];

const TESTIMONIALS = [
  { name: "Carla Mendes", role: "Dona, Salão Bella", text: "Triplicamos os agendamentos no primeiro mês. O bot responde até de madrugada!" },
  { name: "Rafael Souza", role: "Restaurante Sabor & Cia", text: "Recuperamos R$ 8 mil em pedidos abandonados em 30 dias. Vale cada centavo." },
  { name: "Dra. Juliana Lima", role: "Clínica Vida+", text: "Lembretes automáticos reduziram faltas em 60%. A equipe ganhou tempo precioso." },
];

const FAQS = [
  { q: "Preciso de conta no Meta Developer ou tokens da API?", a: "Não. Você conecta seu WhatsApp escaneando um QR Code. Toda a configuração técnica é cuidada pela plataforma." },
  { q: "Como funciona o teste grátis?", a: "Você tem 7 dias gratuitos com acesso completo. Após o período, escolha um plano para continuar." },
  { q: "Posso cancelar quando quiser?", a: "Sim. Sem fidelidade. Cancele pelo painel a qualquer momento." },
  { q: "Funciona com WhatsApp Business?", a: "Sim. Funciona tanto com WhatsApp comum quanto WhatsApp Business." },
  { q: "Meus dados estão seguros?", a: "Sim. Criptografia em trânsito e em repouso, conformidade LGPD e backups diários." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a href="#recursos" className="text-muted-foreground hover:text-foreground">Recursos</a>
            <a href="#precos" className="text-muted-foreground hover:text-foreground">Preços</a>
            <a href="#depoimentos" className="text-muted-foreground hover:text-foreground">Clientes</a>
            <a href="#faq" className="text-muted-foreground hover:text-foreground">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
            <Button asChild className="shadow-glow"><Link to="/auth" search={{ mode: "signup" } as any}>Começar grátis</Link></Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-30 dark:opacity-20" style={{ background: "radial-gradient(ellipse 80% 50% at 50% 0%, oklch(0.62 0.16 152 / 0.3), transparent)" }} />
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-32 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 px-3"><Sparkles className="h-3.5 w-3.5" /> 7 dias grátis • Sem cartão</Badge>
          <h1 className="mx-auto max-w-4xl text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Transformando <span className="text-gradient">conversas</span> em <span className="text-gradient">clientes</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
            A plataforma completa de automação do WhatsApp para negócios locais.
            CRM, chatbot com IA, campanhas e relatórios em um só lugar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow text-base h-12 px-8">
              <Link to="/auth">Começar agora <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="text-base h-12 px-8">
              <a href="#recursos">Ver recursos</a>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sem configuração técnica</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Conexão por QR Code</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Conformidade LGPD</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Recursos</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Tudo o que você precisa</h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">Uma suíte completa para vender mais, atender melhor e crescer com automação.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="shadow-card border-border/60 hover:shadow-glow transition-shadow">
              <CardContent className="p-6">
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Como funciona</Badge>
            <h2 className="text-3xl md:text-5xl font-bold">Conecte em 3 passos</h2>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { step: "01", icon: Smartphone, title: "Escaneie o QR", desc: "Aponte a câmera do WhatsApp para o QR Code. Pronto, sua conta está conectada." },
              { step: "02", icon: Zap, title: "Configure automações", desc: "Crie respostas automáticas, mensagens de boas-vindas e gatilhos por palavras-chave." },
              { step: "03", icon: Send, title: "Atenda e venda", desc: "Receba mensagens, qualifique leads com IA e converta mais com follow-ups inteligentes." },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="relative rounded-2xl border bg-card p-8 shadow-card">
                <div className="text-5xl font-bold text-primary/20">{step}</div>
                <Icon className="h-8 w-8 text-primary mt-4" />
                <h3 className="mt-4 text-xl font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Preços</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Planos que crescem com você</h2>
          <p className="mt-4 text-muted-foreground">Comece grátis por 7 dias. Sem cartão de crédito.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <Card key={plan.id} className={`relative shadow-card ${plan.highlight ? "border-primary shadow-glow scale-[1.02]" : ""}`}>
              {plan.highlight && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 px-3">Mais popular</Badge>
              )}
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-bold">R${plan.price}</span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                <Button asChild className="mt-6 w-full" variant={plan.highlight ? "default" : "outline"}>
                  <Link to="/auth">Começar 7 dias grátis</Link>
                </Button>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="h-5 w-5 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="depoimentos" className="bg-secondary/30 py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Clientes</Badge>
            <h2 className="text-3xl md:text-5xl font-bold">Negócios que cresceram</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="shadow-card">
                <CardContent className="p-6">
                  <div className="flex gap-0.5 text-warning">
                    {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                  </div>
                  <p className="mt-4 text-foreground/90">"{t.text}"</p>
                  <div className="mt-6">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-sm text-muted-foreground">{t.role}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-4 py-20">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4">Perguntas frequentes</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Tire suas dúvidas</h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="rounded-3xl gradient-hero p-12 md:p-16 text-center shadow-glow">
          <Shield className="mx-auto h-12 w-12 text-primary-foreground/80" />
          <h2 className="mt-6 text-3xl md:text-5xl font-bold text-primary-foreground">Pronto para crescer?</h2>
          <p className="mt-4 text-primary-foreground/90 text-lg max-w-xl mx-auto">Comece seu teste grátis hoje. Conecte o WhatsApp em 30 segundos.</p>
          <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-8 text-base">
            <Link to="/auth">Criar minha conta grátis <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-12">
        <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} LocalBoost. Todos os direitos reservados.</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Termos</a>
            <a href="#" className="hover:text-foreground">Privacidade</a>
            <a href="#" className="hover:text-foreground">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
