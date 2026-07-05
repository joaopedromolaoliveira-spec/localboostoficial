import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, QrCode, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { useWhatsApp } from "@/contexts/WhatsAppContext";

export function QRCodeCard() {
  const { connectionStatus, qrCode, loading, error, connect, disconnect } = useWhatsApp();

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" /> Conectar WhatsApp
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription className="text-xs break-words">{error}</AlertDescription>
          </Alert>
        )}

        {connectionStatus === "connected" ? (
          <div className="rounded-lg border bg-primary/5 p-6 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
            <p className="mt-3 font-semibold">🟢 WhatsApp conectado</p>
          </div>
        ) : qrCode ? (
          <div className="rounded-lg border bg-white p-4 text-center">
            <img src={qrCode} alt="QR Code WhatsApp" className="mx-auto h-64 w-64" />
            <p className="mt-3 text-sm text-muted-foreground">
              Abra o WhatsApp → <b>Aparelhos conectados</b> → <b>Conectar aparelho</b> e escaneie.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-8 text-center">
            {loading ? (
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            ) : (
              <QrCode className="mx-auto h-8 w-8 text-muted-foreground" />
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Clique em "Conectar WhatsApp" para gerar o QR Code.
            </p>
          </div>
        )}

        {connectionStatus === "connected" ? (
          <Button variant="outline" onClick={() => void disconnect()} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Desconectar
          </Button>
        ) : (
          <Button onClick={() => void connect()} disabled={loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            Conectar WhatsApp
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
