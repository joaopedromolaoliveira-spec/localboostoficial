import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, CreditCard, AlertTriangle } from "lucide-react";
import { PLANS } from "@/constants/plans";
import { brl } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: [{ title: "Assinatura — LocalBoost" }] }),
  component: BillingPage,
});

type PlanRow = {
  id: string; name: string; description: string | null;
  price_cents: number; features: string[]; highlight: boolean; sort_order: number;
};

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

  const { data: plans } = useQuery({
    queryKey: ["plan-catalog"],
    queryFn: async (): Promise<PlanRow[]> => {
      const { data } = await supabase.from("plan_catalog")
        .select("id,name,description,price_cents,features,highlight,sort_order")
        .eq("is_active", true).order("sort_order");
      if (data && data.length > 0) {
        return data.map((p) => ({
          ...p,
          features: Array.isArray(p.features) ? (p.features as string[]) : [],
        }));
      }
      return PLANS.map((p, i) => ({
        id: p.id, name: p.name, description: p.description,
        price_cents: p.price * 100, features: [...p.features], highlight: p.highlight, sort_order: i,
      }));
    },
  });

  const trialEnd = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
  const expired = sub?.status === "trialing" && trialEnd < Date.now();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Assinatura</h1>
        </header>
        <div className="p-6 space-y-6">
          {expired && (
            <Card className="border-destructive/40 bg-destructive/5">
              <CardContent className="flex items-start gap-3 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-semibold">Seu período de teste terminou</p>
                  <p className="text-sm text-muted-foreground">
                    Para continuar usando o LocalBoost, escolha pelo menos o plano Starter.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Plano atual</CardTitle></CardHeader>
            <CardContent>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                <div className="flex flex-wrap items-center gap-3">
                  <Badge className="bg-primary capitalize">{sub?.plan ?? "trial"}</Badge>
                  <span className="text-sm text-muted-foreground">Status: {sub?.status ?? "—"}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <div>
            <h2 className="mb-4 text-xl font-bold">Escolha um plano</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {(plans ?? []).map((p) => (
                <Card key={p.id} className={`shadow-card ${p.highlight ? "border-primary ring-2 ring-primary/30" : ""}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {p.name}
                      {p.highlight && <Badge className="bg-primary">Recomendado</Badge>}
                    </CardTitle>
                    <div className="text-3xl font-bold">{brl(p.price_cents)}<span className="text-sm font-normal text-muted-foreground">/mês</span></div>
                    {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <ul className="space-y-2 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex items-start gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> {f}</li>
                      ))}
                    </ul>
                    <Button
                      className={`w-full ${p.highlight ? "shadow-glow" : ""}`}
                      variant={p.highlight ? "default" : "outline"}
                      disabled={sub?.plan === p.id && sub?.status === "active"}
                      onClick={() => toast.info("Pagamento via Stripe — finalizando ativação. Em breve o checkout estará disponível.")}
                    >
                      {sub?.plan === p.id && sub?.status === "active" ? "Plano atual" : "Assinar"}
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
