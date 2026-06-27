import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, CreditCard } from "lucide-react";
import { PLANS } from "@/constants/plans";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Assinatura — LocalBoost" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Assinatura</h1>
        </header>
        <div className="p-6 space-y-6">
          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Plano atual</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="text-base capitalize">{sub?.plan ?? "Sem plano"}</Badge>
                  <Badge variant="outline">{sub?.status ?? "—"}</Badge>
                  {sub?.current_period_end && (
                    <span className="text-sm text-muted-foreground">
                      {sub.status === "trialing" ? "Trial termina em" : "Renova em"}: {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-bold">Escolha um plano</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {PLANS.map((p) => (
                <Card key={p.id} className={`shadow-card ${p.featured ? "border-primary ring-2 ring-primary/30" : ""}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {p.name}
                      {p.featured && <Badge className="bg-primary">Recomendado</Badge>}
                    </CardTitle>
                    <div className="text-3xl font-bold">{brl(p.priceCents)}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> {f}</li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${p.featured ? "shadow-glow" : ""}`}
                      variant={p.featured ? "default" : "outline"}
                      disabled={sub?.plan === p.id}
                      onClick={() => toast.info("Pagamentos com Stripe — em ativação. Fale com nosso time.")}
                    >
                      {sub?.plan === p.id ? "Plano atual" : "Assinar"}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
