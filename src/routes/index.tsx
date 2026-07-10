import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { TalkToAgentButton } from "@/components/talk-to-agent-button";
import { Calendar, Bot, MessageSquare, Clock, Check, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Agenda IA — Agendamento por WhatsApp com IA" },
      { name: "description", content: "Um agente de IA no WhatsApp que agenda, confirma, cancela e reagenda horários pelos seus clientes — 24/7." },
      { property: "og:title", content: "Agenda IA — Agendamento por WhatsApp com IA" },
      { property: "og:description", content: "Um agente de IA no WhatsApp que agenda, confirma, cancela e reagenda horários pelos seus clientes — 24/7." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Bot, title: "Agente IA de agendamento", desc: "A IA entende português natural e agenda respeitando sua agenda e horários de atendimento." },
  { icon: Calendar, title: "Sincroniza com sua agenda", desc: "Só oferece horários realmente disponíveis. Sem conflitos, sem overbooking." },
  { icon: MessageSquare, title: "Conversas no WhatsApp", desc: "Integração via WhatsAble. O cliente conversa como faria com uma pessoa." },
  { icon: Clock, title: "24/7", desc: "Nunca perde uma marcação. Confirma, cancela e reagenda a qualquer hora." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost"><Link to="/auth">Entrar</Link></Button>
            <Button asChild className="shadow-glow"><Link to="/auth">Começar</Link></Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 py-20 md:py-28 text-center">
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 px-3"><Sparkles className="h-3.5 w-3.5" /> Agendamento inteligente</Badge>
          <h1 className="mx-auto max-w-4xl text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Sua agenda no <span className="text-gradient">WhatsApp</span>, cuidada por uma <span className="text-gradient">IA</span>.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Um agente que responde seus clientes, marca, confirma, cancela e reagenda — sozinho, o dia inteiro.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow text-base h-12 px-8">
              <Link to="/auth">Criar conta <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <TalkToAgentButton label="Falar com o agente IA LocalBoost" />
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sem configuração técnica</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> IA em português</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Respeita sua agenda</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Recursos</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Tudo o que a agenda precisa</h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <Card key={title} className="shadow-card">
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

      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto max-w-7xl px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} Agenda IA · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
