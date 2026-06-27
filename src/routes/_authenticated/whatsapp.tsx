import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/api-client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, QrCode, RefreshCw, LogOut, Smartphone, CheckCircle2, AlertCircle, Phone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalBoost" }] }),
  component: WhatsAppPage,
});

const STATUS_LABEL: Record<string, { label: string; color: string; icon: any }> = {
  disconnected: { label: "Desconectado", color: "bg-muted text-muted-foreground", icon: AlertCircle },
  connecting: { label: "Conectando…", color: "bg-blue-500/15 text-blue-600", icon: Loader2 },
  scan_qr: { label: "Aguardando QR Code", color: "bg-amber-500/15 text-amber-600", icon: QrCode },
  working: { label: "Conectado", color: "bg-primary/15 text-primary", icon: CheckCircle2 },
  failed: { label: "Falha", color: "bg-destructive/15 text-destructive", icon: AlertCircle },
};

function WhatsAppPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Conexão WhatsApp</h1>
        </header>
        <div className="mx-auto w-full max-w-2xl p-6">
          <SessionCard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SessionCard() {
  const qc = useQueryClient();
  const { data: session } = useQuery({
    queryKey: ["whatsapp-session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("whatsapp_sessions").select("*").eq("owner_id", user.id).eq("name", "default").maybeSingle();
      return data;
    },
    refetchInterval: 4000,
  });

  useEffect(() => {
    const channel = supabase
      .channel("ws-session")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-session"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const connect = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/start", { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("Iniciando conexão…"); qc.invalidateQueries({ queryKey: ["whatsapp-session"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const logout = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/stop", { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("WhatsApp desconectado"); qc.invalidateQueries({ queryKey: ["whatsapp-session"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const pair = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/pair", { method: "POST", body: JSON.stringify({ phone }) });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCode(data.code);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const status = session?.status ?? "disconnected";
  const meta = STATUS_LABEL[status];
  const Icon = meta.icon;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Conectar WhatsApp</CardTitle>
        <CardDescription>Sem configuração técnica — basta conectar seu número.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge className={meta.color}><Icon className={`mr-1 h-3 w-3 ${status === "connecting" ? "animate-spin" : ""}`} /> {meta.label}</Badge>
          {session?.phone_number && <span className="text-sm text-muted-foreground">+{session.phone_number}</span>}
        </div>

        {status === "working" ? (
          <div className="space-y-3">
            <div className="rounded-lg border bg-primary/5 p-4">
              <p className="text-sm font-medium text-primary">WhatsApp ativo</p>
              <p className="text-xs text-muted-foreground">As mensagens são recebidas e enviadas em tempo real. A IA responderá conforme as regras configuradas.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending} className="gap-2">
                {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Desconectar
              </Button>
              <Button variant="ghost" size="icon" onClick={() => qc.invalidateQueries({ queryKey: ["whatsapp-session"] })}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : status === "disconnected" || status === "failed" ? (
          <Button onClick={() => connect.mutate()} disabled={connect.isPending} className="w-full gap-2 shadow-glow" size="lg">
            {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
            Conectar WhatsApp
          </Button>
        ) : (
          <Tabs defaultValue="qr">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="qr"><QrCode className="mr-2 h-4 w-4" /> QR Code</TabsTrigger>
              <TabsTrigger value="phone"><Phone className="mr-2 h-4 w-4" /> Por telefone</TabsTrigger>
            </TabsList>

            <TabsContent value="qr" className="space-y-3">
              {session?.qr_code ? (
                <div className="rounded-lg border bg-white p-4 text-center">
                  <img src={session.qr_code} alt="QR Code WhatsApp" className="mx-auto h-64 w-64" />
                  <p className="mt-3 text-sm text-muted-foreground">WhatsApp &gt; Aparelhos conectados &gt; Conectar um aparelho</p>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                  <p className="mt-3 text-sm text-muted-foreground">Gerando QR Code…</p>
                </div>
              )}
              <Button variant="outline" onClick={() => connect.mutate()} disabled={connect.isPending} className="w-full gap-2">
                {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Atualizar QR
              </Button>
            </TabsContent>

            <TabsContent value="phone" className="space-y-3">
              <p className="text-xs text-muted-foreground">Informe o número com DDI (ex: 5511999998888).</p>
              <div>
                <Label>Número de telefone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="5511999998888" />
              </div>
              <Button onClick={() => pair.mutate()} disabled={pair.isPending || phone.length < 10} className="w-full gap-2 shadow-glow">
                {pair.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
                Pedir código de pareamento
              </Button>
              {code && (
                <div className="rounded-lg border bg-muted/40 p-4 text-center">
                  <p className="text-xs text-muted-foreground">Digite no WhatsApp &gt; Aparelhos conectados &gt; Conectar com número:</p>
                  <p className="mt-2 text-3xl font-bold tracking-widest">{code}</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
