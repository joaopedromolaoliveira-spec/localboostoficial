import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Bot, MessageSquare, Clock, Check, ArrowRight, Sparkles, Zap } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LocalBoost — Atendimento com IA 24/7" },
      { name: "description", content: "Agente de IA que atende seus clientes no site, tira dúvidas e converte visitantes em vendas — 24 horas por dia." },
      { property: "og:title", content: "LocalBoost — Atendimento com IA 24/7" },
      { property: "og:description", content: "Agente de IA que atende seus clientes no site 24/7." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Bot, title: "Agente IA treinado", desc: "Responde dúvidas dos seus clientes usando o conhecimento do seu negócio." },
  { icon: MessageSquare, title: "Chat no seu site", desc: "Bolha de chat inteligente integrada em todas as páginas, pronta para conversar." },
  { icon: Zap, title: "Respostas instantâneas", desc: "Sem espera. O visitante recebe resposta em segundos, a qualquer hora." },
  { icon: Clock, title: "24/7", desc: "Nunca perde uma oportunidade. Seu atendimento nunca dorme." },
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
          <Badge variant="secondary" className="mb-6 gap-1.5 py-1.5 px-3"><Sparkles className="h-3.5 w-3.5" /> Atendimento inteligente</Badge>
          <h1 className="mx-auto max-w-4xl text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Um <span className="text-gradient">agente de IA</span> atendendo seus clientes agora.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg md:text-xl text-muted-foreground">
            Converse com o assistente da LocalBoost no canto da tela. Ele responde dúvidas, guia visitantes e trabalha sem parar.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="shadow-glow text-base h-12 px-8">
              <Link to="/auth">Criar conta <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </div>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Sem instalação técnica</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> IA em português</span>
            <span className="flex items-center gap-2"><Check className="h-4 w-4 text-primary" /> Ativo 24/7</span>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Recursos</Badge>
          <h2 className="text-3xl md:text-5xl font-bold">Tudo o que o atendimento precisa</h2>
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
          © {new Date().getFullYear()} LocalBoost · Todos os direitos reservados
        </div>
      </footer>
    </div>
  );
}
