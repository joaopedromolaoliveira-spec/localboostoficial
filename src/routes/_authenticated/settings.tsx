import { createFileRoute } from "@tanstack/react-router";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Webhook, Copy } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Configurações" }] }),
  component: SettingsPage,
});

const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

function SettingsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger /><h1 className="font-semibold">Configurações</h1>
        </header>
        <div className="p-6 space-y-6 max-w-3xl">
          <BotSection />
          <ScheduleSection />
          <WebhookSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function BotSection() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["bot"],
    queryFn: async () => (await supabase.from("bot_settings").select("*").maybeSingle()).data,
  });
  const [form, setForm] = useState({ name: "", personality: "", system_prompt: "" });
  useEffect(() => { if (data) setForm({ name: data.name, personality: data.personality, system_prompt: data.system_prompt }); }, [data]);

  const save = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");
      const { error } = await supabase.from("bot_settings").update(form).eq("owner_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Bot salvo"); qc.invalidateQueries({ queryKey: ["bot"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <Loader2 className="h-5 w-5 animate-spin" />;
  return (
    <Card><CardHeader><CardTitle>Assistente</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Personalidade</Label><Textarea rows={2} value={form.personality} onChange={(e) => setForm({ ...form, personality: e.target.value })} /></div>
        <div><Label>Prompt do sistema</Label><Textarea rows={6} value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} /></div>
        <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar assistente"}</Button>
      </CardContent>
    </Card>
  );
}

function ScheduleSection() {
  const qc = useQueryClient();
  const { data: schedule } = useQuery({
    queryKey: ["schedule"],
    queryFn: async () => (await supabase.from("schedule_settings").select("*").maybeSingle()).data,
  });
  const { data: hours = [] } = useQuery({
    queryKey: ["hours"],
    queryFn: async () => (await supabase.from("working_hours").select("*").order("day_of_week")).data ?? [],
  });
  const [duration, setDuration] = useState(60);
  const [buffer, setBuffer] = useState(15);
  const [tz, setTz] = useState("Europe/Madrid");
  useEffect(() => {
    if (schedule) {
      setDuration(schedule.appointment_duration_minutes);
      setBuffer(schedule.buffer_minutes);
      setTz(schedule.timezone);
    }
  }, [schedule]);

  const saveSched = useMutation({
    mutationFn: async () => {
      if (!schedule) return;
      const { error } = await supabase.from("schedule_settings").update({
        appointment_duration_minutes: duration, buffer_minutes: buffer, timezone: tz,
      }).eq("id", schedule.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Agenda salva"); qc.invalidateQueries({ queryKey: ["schedule"] }); },
  });

  const saveHour = useMutation({
    mutationFn: async (h: { id: string; is_enabled: boolean; start_time: string; end_time: string }) => {
      const { error } = await supabase.from("working_hours").update({
        is_enabled: h.is_enabled, start_time: h.start_time, end_time: h.end_time,
      }).eq("id", h.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["hours"] }),
  });

  return (
    <Card><CardHeader><CardTitle>Agenda e horários</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Duração (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
          <div><Label>Buffer (min)</Label><Input type="number" value={buffer} onChange={(e) => setBuffer(Number(e.target.value))} /></div>
          <div><Label>Fuso</Label><Input value={tz} onChange={(e) => setTz(e.target.value)} /></div>
        </div>
        <Button onClick={() => saveSched.mutate()} disabled={saveSched.isPending}>Salvar agenda</Button>
        <div className="border-t pt-4 space-y-2">
          {hours.map((h) => (
            <div key={h.id} className="flex items-center gap-3">
              <div className="w-24 text-sm font-medium">{DAY_NAMES[h.day_of_week]}</div>
              <Switch checked={h.is_enabled} onCheckedChange={(v) => saveHour.mutate({ ...h, is_enabled: v })} />
              <Input type="time" defaultValue={h.start_time.slice(0, 5)} className="w-32"
                onBlur={(e) => saveHour.mutate({ ...h, start_time: e.target.value })} />
              <span>—</span>
              <Input type="time" defaultValue={h.end_time.slice(0, 5)} className="w-32"
                onBlur={(e) => saveHour.mutate({ ...h, end_time: e.target.value })} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WebhookSection() {
  const { data: user } = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = user ? `${origin}/api/public/webhooks/whatsable?owner=${user.id}` : "";
  return (
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><Webhook className="h-4 w-4" /> Webhook WhatsAble</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">Configure este URL como webhook de mensagens no painel WhatsAble:</p>
        <div className="flex gap-2">
          <Input readOnly value={url} className="font-mono text-xs" />
          <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copiado"); }}>
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
