import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
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
import { useUserRoles } from "@/hooks/use-user-roles";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/plans")({
  head: () => ({ meta: [{ title: "Planos — Admin" }] }),
  component: AdminPlansPage,
});

type Plan = {
  id: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  features: any;
  highlight: boolean;
  is_active: boolean;
  sort_order: number;
  stripe_price_id: string | null;
};

function AdminPlansPage() {
  const navigate = useNavigate();
  const { isAdmin, isLoading } = useUserRoles();
  useEffect(() => { if (!isLoading && !isAdmin) navigate({ to: "/dashboard" }); }, [isAdmin, isLoading, navigate]);

  const qc = useQueryClient();
  const { data: plans } = useQuery({
    queryKey: ["plan-catalog-admin"],
    queryFn: async () => {
      const { data } = await supabase.from("plan_catalog").select("*").order("sort_order");
      return (data ?? []) as Plan[];
    },
  });

  const save = useMutation({
    mutationFn: async (p: Plan) => {
      const features = Array.isArray(p.features)
        ? p.features
        : String(p.features ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      const { error } = await supabase.from("plan_catalog").upsert({
        id: p.id, name: p.name, description: p.description, price_cents: p.price_cents,
        currency: p.currency, features, highlight: p.highlight, is_active: p.is_active,
        sort_order: p.sort_order, stripe_price_id: p.stripe_price_id,
      }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plano salvo"); qc.invalidateQueries({ queryKey: ["plan-catalog-admin"] }); qc.invalidateQueries({ queryKey: ["plan-catalog"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plan_catalog").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Plano removido"); qc.invalidateQueries({ queryKey: ["plan-catalog-admin"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [draft, setDraft] = useState<Plan>({
    id: "", name: "", description: "", price_cents: 0, currency: "BRL",
    features: [], highlight: false, is_active: true, sort_order: 99, stripe_price_id: null,
  });

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Planos & Preços</h1>
          <Button asChild variant="ghost" size="sm" className="ml-auto"><Link to="/admin">Voltar ao admin</Link></Button>
        </header>
        <div className="space-y-6 p-6">
          {(plans ?? []).map((p) => (<PlanEditor key={p.id} plan={p} onSave={(x) => save.mutate(x)} onDelete={() => remove.mutate(p.id)} saving={save.isPending} />))}

          <Card className="shadow-card">
            <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" /> Novo plano</CardTitle></CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <div><Label>ID (slug)</Label><Input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="enterprise" /></div>
              <div><Label>Nome</Label><Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
              <div><Label>Preço (centavos)</Label><Input type="number" value={draft.price_cents} onChange={(e) => setDraft({ ...draft, price_cents: Number(e.target.value) })} /></div>
              <div><Label>Ordem</Label><Input type="number" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Descrição</Label><Input value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Recursos (uma por linha)</Label>
                <Textarea rows={4} value={Array.isArray(draft.features) ? draft.features.join("\n") : ""} onChange={(e) => setDraft({ ...draft, features: e.target.value.split("\n") })} />
              </div>
              <Button onClick={() => save.mutate(draft)} disabled={!draft.id || !draft.name || save.isPending} className="md:col-span-2 gap-2">
                {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Criar plano
              </Button>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PlanEditor({ plan, onSave, onDelete, saving }: { plan: Plan; onSave: (p: Plan) => void; onDelete: () => void; saving: boolean }) {
  const [p, setP] = useState<Plan>(plan);
  useEffect(() => setP(plan), [plan]);
  const featuresText = Array.isArray(p.features) ? p.features.join("\n") : "";
  return (
    <Card className="shadow-card">
      <CardHeader><CardTitle className="flex items-center justify-between">
        <span>{p.name} <span className="ml-2 text-xs text-muted-foreground">/{p.id}</span></span>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Ativo</Label>
          <Switch checked={p.is_active} onCheckedChange={(v) => setP({ ...p, is_active: v })} />
          <Label className="text-xs ml-2">Destaque</Label>
          <Switch checked={p.highlight} onCheckedChange={(v) => setP({ ...p, highlight: v })} />
        </div>
      </CardTitle></CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        <div><Label>Nome</Label><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></div>
        <div><Label>Preço (centavos)</Label><Input type="number" value={p.price_cents} onChange={(e) => setP({ ...p, price_cents: Number(e.target.value) })} /></div>
        <div className="md:col-span-2"><Label>Descrição</Label><Input value={p.description ?? ""} onChange={(e) => setP({ ...p, description: e.target.value })} /></div>
        <div className="md:col-span-2"><Label>Recursos (uma por linha)</Label>
          <Textarea rows={5} value={featuresText} onChange={(e) => setP({ ...p, features: e.target.value.split("\n") })} />
        </div>
        <div><Label>Stripe Price ID</Label><Input value={p.stripe_price_id ?? ""} onChange={(e) => setP({ ...p, stripe_price_id: e.target.value || null })} placeholder="price_..." /></div>
        <div><Label>Ordem</Label><Input type="number" value={p.sort_order} onChange={(e) => setP({ ...p, sort_order: Number(e.target.value) })} /></div>
        <div className="md:col-span-2 flex gap-2">
          <Button onClick={() => onSave(p)} disabled={saving} className="gap-2"><Save className="h-4 w-4" /> Salvar</Button>
          <Button variant="outline" onClick={onDelete} className="gap-2 text-destructive"><Trash2 className="h-4 w-4" /> Remover</Button>
        </div>
      </CardContent>
    </Card>
  );
}
