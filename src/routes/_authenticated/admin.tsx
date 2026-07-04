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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shield, Users, CreditCard, TrendingUp, Loader2, Save, AlertTriangle } from "lucide-react";
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

          <WahaErrorsCard />
          <PlansEditor />
          <UsersPlansEditor />
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

type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
};
type SubRow = { user_id: string; plan: string; status: string; current_period_end: string | null };

const PLAN_OPTIONS = ["trial", "starter", "pro", "business"] as const;
const STATUS_OPTIONS = ["trialing", "active", "past_due", "canceled"] as const;

function UsersPlansEditor() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-subs"],
    queryFn: async () => {
      const [{ data: profiles }, { data: subs }] = await Promise.all([
        supabase.from("profiles").select("id,email,full_name,business_name").order("created_at", { ascending: false }).limit(200),
        supabase.from("subscriptions").select("user_id,plan,status,current_period_end"),
      ]);
      const subMap = new Map<string, SubRow>();
      (subs ?? []).forEach((s) => subMap.set(s.user_id, s as SubRow));
      return { users: (profiles ?? []) as UserRow[], subs: subMap };
    },
  });

  const setPlan = useMutation({
    mutationFn: async (args: { userId: string; plan: string; status: string }) => {
      const { error } = await supabase.rpc("admin_set_user_plan", {
        _user_id: args.userId,
        _plan: args.plan as never,
        _status: args.status as never,
        _period_end: undefined as never,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plano atualizado"); qc.invalidateQueries({ queryKey: ["admin-users-subs"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = (data?.users ?? []).filter((u) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (u.email ?? "").toLowerCase().includes(q)
      || (u.full_name ?? "").toLowerCase().includes(q)
      || (u.business_name ?? "").toLowerCase().includes(q);
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Usuários & Planos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input placeholder="Buscar por nome, email ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        <div className="space-y-2">
          {filtered.map((u) => {
            const sub = data?.subs.get(u.id);
            const plan = sub?.plan ?? "trial";
            const status = sub?.status ?? "trialing";
            return (
              <div key={u.id} className="flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="truncate font-medium">{u.full_name || u.email || u.id}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.email}{u.business_name ? ` · ${u.business_name}` : ""}</div>
                  <div className="mt-1 flex gap-2">
                    <Badge variant="outline" className="capitalize">{plan}</Badge>
                    <Badge variant="outline">{status}</Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue={plan} onValueChange={(v) => setPlan.mutate({ userId: u.id, plan: v, status: v === "trial" ? "trialing" : "active" })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLAN_OPTIONS.map((p) => <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select defaultValue={status} onValueChange={(v) => setPlan.mutate({ userId: u.id, plan, status: v })}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


type WahaErrorRow = {
  id: string;
  owner_id: string | null;
  endpoint: string;
  http_status: number | null;
  message: string | null;
  key_source: string | null;
  key_length: number | null;
  created_at: string;
};

function WahaErrorsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["waha-errors"],
    queryFn: async (): Promise<WahaErrorRow[]> => {
      const { data } = await supabase.from("waha_error_log" as never)
        .select("*").order("created_at", { ascending: false }).limit(20);
      return (data ?? []) as unknown as WahaErrorRow[];
    },
    refetchInterval: 10000,
  });

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-500" /> Últimos erros WAHA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum erro registrado. 🎉</p>
        )}
        {(data ?? []).map((e) => (
          <div key={e.id} className="rounded-md border p-3 text-sm space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="destructive">HTTP {e.http_status ?? "?"}</Badge>
              <span className="font-mono text-xs">{e.endpoint}</span>
              <Badge variant="outline">
                {e.key_source ?? "sem key"}{e.key_length ? ` · ${e.key_length} chars` : ""}
              </Badge>
              <span className="ml-auto text-xs text-muted-foreground">
                {new Date(e.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            {e.message && (
              <p className="text-xs text-muted-foreground break-words">{e.message}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
