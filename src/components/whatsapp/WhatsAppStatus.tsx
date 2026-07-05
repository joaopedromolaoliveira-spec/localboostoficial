import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Loader2, PowerOff } from "lucide-react";
import { useWhatsApp } from "@/contexts/WhatsAppContext";

const META = {
  connected: { label: "🟢 WhatsApp conectado", cls: "bg-primary/15 text-primary", Icon: CheckCircle2, spin: false },
  connecting: { label: "Conectando…", cls: "bg-amber-500/15 text-amber-600", Icon: Loader2, spin: true },
  disconnected: { label: "Desconectado", cls: "bg-muted text-muted-foreground", Icon: PowerOff, spin: false },
} as const;

export function WhatsAppStatus() {
  const { connectionStatus, rawStatus } = useWhatsApp();
  const { label, cls, Icon, spin } = META[connectionStatus];
  return (
    <div className="flex items-center gap-2">
      <Badge className={cls}>
        <Icon className={`mr-1 h-3 w-3 ${spin ? "animate-spin" : ""}`} />
        {label}
      </Badge>
      {rawStatus && (
        <span className="text-xs text-muted-foreground">({rawStatus})</span>
      )}
    </div>
  );
}
