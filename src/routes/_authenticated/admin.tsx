import { createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Shield, Users, CreditCard, TrendingUp, Loader2, Save } from "lucide-react";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — LocalBoost" }] }),
  component: AdminPage,
});

type PlanRow = {
  id: string; name: string; description: string | null;
  price_cents: number; features: unknown; highlight: boolean;
  sort_order: number; is_active: boolean; stripe_price_id: string | null;
};

function AdminPage() {
  const { data } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: async () => {
      const [users, subs, contacts, messages] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("subscriptions").select("plan, status, amount_cents"),
        supabase.from("contacts").select("*", { count: "exact", head: true }),
        supabase.from("messages").select("*", { count: "exact", head: true }),
      ]);
      const mrr = (subs.data ?? []).filter((s) => s.status === "active").reduce((sum, s) => sum + (s.amount_cents ?? 0), 0);
      return {
        users: users.count ?? 0, contacts: contacts.count ?? 0, messages: messages.count ?? 0,
        mrr, arr: mrr * 12,
        activeSubs: (subs.data ?? []).filter((s) => s.status === "active").length,
      };
    },
  });

  const cards = [
    { label: "Usuários", value: data?.users ?? 0, icon: Users },
    { label: "Assinaturas ativas", value: data?.activeSubs ?? 0, icon: CreditCard },
    { label: "MRR", value: brl(data?.mrr ?? 0), icon: TrendingUp },
    { label: "ARR", value: brl(data?.arr ?? 0), icon: TrendingUp },
  ];

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><Shield className="h-4 w-4 text-primary" /><h1 className="font-semibold">Painel Administrativo</h1>
        </header>
        <div className="p-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label} className="shadow-card">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">{value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <PlansEditor />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PlansEditor() {
  const qc = useQueryClient();
  const { data: plans, isLoading } = useQuery({
    queryKey: ["plan-catalog-admin"],
    queryFn: async (): Promise<PlanRow[]> => {
      const { data } = await supabase.from("plan_catalog").select("*").order("sort_order");
      return (data ?? []) as PlanRow[];
    },
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle>Planos & Preços</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {(plans ?? []).length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nenhum plano cadastrado ainda.</p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {(plans ?? []).map((p) => (
            <PlanCard key={p.id} plan={p} onSaved={() => qc.invalidateQueries({ queryKey: ["plan-catalog-admin"] })} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function PlanCard({ plan, onSaved }: { plan: PlanRow; onSaved: () => void }) {
  const featuresArr = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const [form, setForm] = useState({
    name: plan.name,
    description: plan.description ?? "",
    price_cents: plan.price_cents,
    features: featuresArr.join("\n"),
    highlight: plan.highlight,
    is_active: plan.is_active,
    stripe_price_id: plan.stripe_price_id ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("plan_catalog").update({
        name: form.name,
        description: form.description || null,
        price_cents: Number(form.price_cents) || 0,
        features: form.features.split("\n").map((s) => s.trim()).filter(Boolean),
        highlight: form.highlight,
        is_active: form.is_active,
        stripe_price_id: form.stripe_price_id || null,
      }).eq("id", plan.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success(`Plano ${form.name} salvo`); onSaved(); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-base capitalize">{plan.id}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Descrição</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        <div><Label>Preço (centavos)</Label>
          <Input type="number" value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: Number(e.target.value) })} />
          <p className="mt-1 text-xs text-muted-foreground">{brl(Number(form.price_cents) || 0)}/mês</p>
        </div>
        <div><Label>Recursos (um por linha)</Label>
          <Textarea rows={5} value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></div>
        <div><Label>Stripe Price ID</Label>
          <Input placeholder="price_..." value={form.stripe_price_id} onChange={(e) => setForm({ ...form, stripe_price_id: e.target.value })} /></div>
        <div className="flex items-center justify-between"><Label>Destaque</Label>
          <Switch checked={form.highlight} onCheckedChange={(v) => setForm({ ...form, highlight: v })} /></div>
        <div className="flex items-center justify-between"><Label>Ativo</Label>
          <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending} className="w-full gap-2">
          {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Salvar
        </Button>
      </CardContent>
    </Card>
  );
}
