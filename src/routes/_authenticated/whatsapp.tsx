import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { authedFetch } from "@/lib/api-client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2, QrCode, RefreshCw, LogOut, Smartphone, CheckCircle2, AlertCircle, Activity,
} from "lucide-react";

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
        <div className="flex flex-col items-center gap-6 p-6">
          <SessionCard />
          <HealthCard />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function SessionCard() {
  const qc = useQueryClient();
  const [lastError, setLastError] = useState<string | null>(null);
  // Guards against the auto-start loop: only ONE auto-attempt per mount.
  const autoStartedRef = useRef(false);

  const { data: session } = useQuery({
    queryKey: ["whatsapp-session"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("whatsapp_sessions").select("*")
        .eq("owner_id", user.id).eq("name", "default").maybeSingle();
      return data;
    },
    // Only poll while we're actively waiting for the QR / connection.
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | null)?.status;
      if (s === "working" || s === "failed") return false;
      return 4000;
    },
  });

  const runStart = async () => {
    setLastError(null);
    const res = await authedFetch("/api/public/waha/start", { method: "POST", body: "{}" });
    if (!res.ok) {
      const msg = await res.text();
      setLastError(msg || `HTTP ${res.status}`);
      return false;
    }
    qc.invalidateQueries({ queryKey: ["whatsapp-session"] });
    return true;
  };

  // ONE auto-start attempt per page mount. Never retries on failure — the user
  // must click "Atualizar QR Code" to try again. This kills the infinite loop.
  useEffect(() => {
    if (autoStartedRef.current) return;
    if (!session) {
      // No row yet OR still loading. If session is undefined (loading), wait.
      if (session === undefined) return;
    }
    const st = session?.status;
    if (st === "working" || st === "connecting" || st === "scan_qr") return;
    autoStartedRef.current = true;
    void runStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session === undefined]);

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
      const ok = await runStart();
      if (!ok) throw new Error(lastError ?? "Falha ao iniciar sessão");
    },
    onSuccess: () => toast.success("QR Code atualizado"),
    onError: (e: Error) => toast.error(e.message),
  });

  const logout = useMutation({
    mutationFn: async () => {
      const res = await authedFetch("/api/public/waha/stop", { method: "POST", body: "{}" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      autoStartedRef.current = false;
      toast.success("WhatsApp desconectado");
      qc.invalidateQueries({ queryKey: ["whatsapp-session"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const status = session?.status ?? "connecting";
  const meta = STATUS_LABEL[status] ?? STATUS_LABEL.connecting;
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

        {lastError && status !== "working" && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Não foi possível iniciar</AlertTitle>
            <AlertDescription className="text-xs break-words">{lastError}</AlertDescription>
          </Alert>
        )}

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
        ) : status === "failed" ? (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
            <p className="mt-3 text-sm">Não conseguimos iniciar a sessão. Rode o teste de conexão abaixo e clique em "Atualizar QR Code".</p>
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

type HealthResult = {
  ok: boolean;
  base_url: string;
  key_source: string | null;
  key_length: number;
  key_masked: string;
  checks: { endpoint: string; ok: boolean; status: number | null; error?: string }[];
};

function HealthCard() {
  const [data, setData] = useState<HealthResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await authedFetch("/api/public/waha/health", { method: "GET" });
      const json = (await res.json()) as HealthResult;
      setData(json);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Teste de conexão WAHA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={loading} variant="outline" className="w-full gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
          Rodar diagnóstico
        </Button>

        {data && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3 space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Endpoint</span>
                <span className="font-mono text-xs break-all">{data.base_url || "(ausente)"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Variável</span>
                <Badge variant="outline">{data.key_source ?? "(nenhuma)"}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">API key</span>
                <span className="font-mono text-xs">{data.key_masked}</span></div>
            </div>
            <div className="space-y-2">
              {data.checks.map((c) => (
                <div key={c.endpoint} className="rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs">{c.endpoint}</span>
                    {c.ok
                      ? <Badge className="bg-primary/15 text-primary">OK</Badge>
                      : <Badge variant="destructive">{c.status ?? "erro"}</Badge>}
                  </div>
                  {c.error && <p className="mt-1 text-xs text-destructive break-words">{c.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
