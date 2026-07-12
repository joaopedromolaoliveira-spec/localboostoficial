import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, QrCode, Phone, AlertCircle, CheckCircle2, RefreshCw, LogOut } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/whatsapp-connect")({
  head: () => ({ meta: [{ title: "Conectar WhatsApp" }] }),
  component: WhatsAppConnectPage,
});

function WhatsAppConnectPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">Conectar WhatsApp</h1>
        </header>
        <div className="p-6 space-y-6 max-w-3xl">
          <EvolutionConnectionSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function EvolutionConnectionSection() {
  const qc = useQueryClient();
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);

  const { data: instance, isLoading, refetch } = useQuery({
    queryKey: ["evolution-instance"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Sem sessão");

      const response = await fetch("/api/evolution/instance", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar instância");
      }

      return response.json();
    },
    refetchInterval: instance?.status === "scan_qr" ? 3000 : 10000,
  });

  const createInstance = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/evolution/create-instance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar instância");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setQrCodeData(data.qrCode?.base64 || data.qrCode?.code);
      toast.success("Instância criada. Escaneie o QR Code com seu WhatsApp.");
      qc.invalidateQueries({ queryKey: ["evolution-instance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reconnect = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/evolution/reconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao reconectar");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setQrCodeData(data.qrCode?.base64 || data.qrCode?.code);
      toast.success("QR Code atualizado. Escaneie com seu WhatsApp.");
      qc.invalidateQueries({ queryKey: ["evolution-instance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/evolution/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao desconectar");
      }

      return response.json();
    },
    onSuccess: () => {
      setQrCodeData(null);
      toast.success("WhatsApp desconectado.");
      qc.invalidateQueries({ queryKey: ["evolution-instance"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "connected":
        return "bg-green-100 text-green-800";
      case "connecting":
      case "scan_qr":
        return "bg-yellow-100 text-yellow-800";
      case "failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "connected":
        return <CheckCircle2 className="h-4 w-4" />;
      case "connecting":
      case "scan_qr":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "failed":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (isLoading && !instance) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Status da Conexão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {instance ? (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  <Badge className={getStatusColor(instance.status)}>
                    {getStatusIcon(instance.status)}
                    <span className="ml-2 capitalize">{instance.status || "desconectado"}</span>
                  </Badge>
                </div>

                {instance.phone_number && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Número:</span>
                    <span className="text-sm">{instance.phone_number}</span>
                  </div>
                )}

                {instance.profile_name && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Perfil:</span>
                    <span className="text-sm">{instance.profile_name}</span>
                  </div>
                )}

                {instance.profile_picture_url && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Foto:</span>
                    <img
                      src={instance.profile_picture_url}
                      alt="Perfil"
                      className="h-8 w-8 rounded-full"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-wrap">
                {instance.status === "connected" ? (
                  <>
                    <Button
                      onClick={() => reconnect.mutate()}
                      disabled={reconnect.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {reconnect.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Atualizar QR Code
                    </Button>
                    <Button
                      onClick={() => disconnect.mutate()}
                      disabled={disconnect.isPending}
                      variant="destructive"
                      size="sm"
                    >
                      {disconnect.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <LogOut className="h-4 w-4 mr-2" />
                      )}
                      Desconectar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => createInstance.mutate()}
                      disabled={createInstance.isPending}
                      size="sm"
                    >
                      {createInstance.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <QrCode className="h-4 w-4 mr-2" />
                      )}
                      Gerar QR Code
                    </Button>
                    <Button
                      onClick={() => reconnect.mutate()}
                      disabled={reconnect.isPending}
                      variant="outline"
                      size="sm"
                    >
                      {reconnect.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Reconectar
                    </Button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                Nenhuma instância de WhatsApp conectada
              </p>
              <Button
                onClick={() => createInstance.mutate()}
                disabled={createInstance.isPending}
              >
                {createInstance.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <QrCode className="h-4 w-4 mr-2" />
                )}
                Conectar WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {qrCodeData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code para Escanear
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center py-6">
            {qrCodeData.startsWith("data:") ? (
              <img
                src={qrCodeData}
                alt="QR Code"
                className="h-64 w-64 border-2 border-gray-200 rounded-lg"
              />
            ) : (
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie este código com seu WhatsApp
                </p>
                <div className="text-xs font-mono bg-gray-100 p-4 rounded break-all max-w-sm">
                  {qrCodeData}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Como conectar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ol className="list-decimal list-inside space-y-2">
            <li>Clique em "Conectar WhatsApp" para gerar um QR Code</li>
            <li>Abra o WhatsApp no seu telefone</li>
            <li>Vá para Configurações → Aparelhos conectados</li>
            <li>Clique em "Conectar um aparelho"</li>
            <li>Aponte a câmera para o QR Code</li>
            <li>Aguarde a conexão ser estabelecida</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
