import { useState, type FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useWhatsApp } from "@/contexts/WhatsAppContext";

export function SendMessageCard() {
  const { connectionStatus, sendMessage, loading } = useWhatsApp();
  const [phone, setPhone] = useState("");
  const [text, setText] = useState("");
  const disabled = connectionStatus !== "connected" || loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await sendMessage(phone, text);
      toast.success("Mensagem enviada");
      setText("");
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" /> Enviar mensagem
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="phone">Telefone (com DDI, ex.: 5511999999999)</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)}
              placeholder="5511999999999" inputMode="numeric" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="text">Mensagem</Label>
            <Textarea id="text" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="Olá!" rows={4} required />
          </div>
          <Button type="submit" disabled={disabled} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Enviar
          </Button>
          {connectionStatus !== "connected" && (
            <p className="text-xs text-muted-foreground text-center">
              Conecte o WhatsApp para habilitar o envio.
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
