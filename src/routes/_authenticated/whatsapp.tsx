import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/api-client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, RefreshCw, LogOut, Smartphone, CheckCircle2, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  head: () => ({ meta: [{ title: "WhatsApp — LocalBoost" }] }),
  component: WhatsAppPage,
});

const STATUS_LABEL: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
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
        <div className="flex justify-center p-6">
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
      const { data } = await supabase.from("whatsapp_sessions").select("*")
        .eq("owner_id", user.id).eq("name", "default").maybeSingle();
      return data;
    },
    refetchInterval: 4000,
  });

  // Auto-start the session as soon as the user opens the page if not connected.
  useEffect(() => {
    if (!session) return;
    if (session.status === "disconnected" || session.status === "failed") {
      authedFetch("/api/public/waha/start", { method: "POST", body: "{}" }).catch(() => {});
    }
  }, [session?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Trigger first session creation when there's no row yet.
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("whatsapp_sessions").select("id")
        .eq("owner_id", user.id).eq("name", "default").maybeSingle();
      if (!data) {
        await authedFetch("/api/public/waha/start", { method: "POST", body: "{}" }).catch(() => {});
        qc.invalidateQueries({ queryKey: ["whatsapp-session"] });
      }
    })();
  }, [qc]);

  useEffect(() => {
    const channel = supabase
      .channel("ws-session")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_sessions" }, () => {
        qc.invalidateQueries({ queryKey: ["whatsapp-session"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/start", { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["whatsapp-session"] }); toast.success("QR Code atualizado"); },
    onError: (e: Error) => toast.error(e.message),
  });

  const logout = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/stop", { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => { toast.success("WhatsApp desconectado"); qc.invalidateQueries({ queryKey: ["whatsapp-session"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = session?.status ?? "connecting";
  const meta = STATUS_LABEL[status];
  const Icon = meta.icon;

  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" /> Sua sessão WhatsApp</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className={meta.color}>
            <Icon className={`mr-1 h-3 w-3 ${status === "connecting" ? "animate-spin" : ""}`} /> {meta.label}
          </Badge>
          {session?.phone_number && (
            <span className="text-sm text-muted-foreground">+{session.phone_number}</span>
          )}
        </div>

        {status === "working" ? (
          <div className="rounded-lg border bg-primary/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-3 font-semibold">WhatsApp conectado</p>
            <p className="text-sm text-muted-foreground">Suas mensagens já chegam em Conversas em tempo real.</p>
          </div>
        ) : status === "scan_qr" && session?.qr_code ? (
          <div className="rounded-lg border bg-white p-4 text-center">
            <img src={session.qr_code} alt="QR Code WhatsApp" className="mx-auto h-64 w-64" />
            <p className="mt-3 text-sm text-muted-foreground">
              Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar um aparelho</b> e escaneie este código.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">Preparando seu QR Code…</p>
          </div>
        )}

        <div className="flex gap-2">
          {status !== "working" && (
            <Button onClick={() => refresh.mutate()} disabled={refresh.isPending} className="flex-1 gap-2 shadow-glow">
              {refresh.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Atualizar QR Code
            </Button>
          )}
          {status === "working" && (
            <Button variant="outline" onClick={() => logout.mutate()} disabled={logout.isPending} className="flex-1 gap-2">
              {logout.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              Desconectar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
