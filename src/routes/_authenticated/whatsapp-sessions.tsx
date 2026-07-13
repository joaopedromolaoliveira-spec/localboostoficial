import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  QrCode,
  Phone,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  LogOut,
  Plus,
  Trash2,
  Copy,
} from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/whatsapp-sessions")({
  head: () => ({ meta: [{ title: "Sessões WhatsApp" }] }),
  component: WhatsAppSessionsPage,
});

interface EvolutionInstance {
  id: string;
  owner_id: string;
  instance_name: string;
  status: string;
  qr_code: string | null;
  phone_number: string | null;
  profile_name: string | null;
  profile_picture_url: string | null;
  created_at: string;
  updated_at: string;
}

function WhatsAppSessionsPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">Sessões WhatsApp</h1>
        </header>
        <div className="p-6 space-y-6 max-w-6xl">
          <EvolutionSessionsSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function EvolutionSessionsSection() {
  const qc = useQueryClient();
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);

  const { data: instances, isLoading } = useQuery({
    queryKey: ["evolution-instances"],
    queryFn: async () => {
      const response = await fetch("/api/evolution-multi?action=instances");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao buscar instâncias");
      }
      return response.json().then((data) => data.instances as EvolutionInstance[]);
    },
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/stripe?action=subscriptions");
      if (!response.ok) return null;
      const data = await response.json();
      return data.subscription;
    },
  });

  const createInstance = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/evolution-multi?action=create-instance", {
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
      setSelectedQrCode(data.qrCode?.base64 || data.qrCode?.code);
      toast.success("Instância criada. Escaneie o QR Code com seu WhatsApp.");
      qc.invalidateQueries({ queryKey: ["evolution-instances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const reconnect = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/evolution-multi?action=reconnect&id=${instanceId}`, {
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
      setSelectedQrCode(data.qrCode?.base64 || data.qrCode?.code);
      toast.success("QR Code atualizado. Escaneie com seu WhatsApp.");
      qc.invalidateQueries({ queryKey: ["evolution-instances"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const disconnect = useMutation({
    mutationFn: async (instanceId: string) => {
      const response = await fetch(`/api/evolution-multi?action=disconnect&id=${instanceId}`, {
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
      setSelectedQrCode(null);
      toast.success("WhatsApp desconectado.");
      qc.invalidateQueries({ queryKey: ["evolution-instances"] });
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

  if (isLoading && !instances) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const maxInstances = subscription?.plan === "business" ? -1 : subscription?.plan === "pro" ? 3 : 1;
  const canAddMore = maxInstances === -1 || (instances?.length || 0) < maxInstances;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Suas Sessões WhatsApp
            </span>
            <Badge variant="outline">
              {instances?.length || 0} / {maxInstances === -1 ? "∞" : maxInstances}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canAddMore && (
            <Button
              onClick={() => createInstance.mutate()}
              disabled={createInstance.isPending}
              size="sm"
            >
              {createInstance.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Adicionar Nova Sessão
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Instances Grid */}
      {instances && instances.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances.map((instance) => (
            <Card key={instance.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{instance.profile_name || "Sem Nome"}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{instance.instance_name}</p>
                  </div>
                  <Badge className={getStatusColor(instance.status)}>
                    {getStatusIcon(instance.status)}
                    <span className="ml-1 capitalize text-xs">{instance.status || "desconectado"}</span>
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {instance.phone_number && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Número:</span>
                    <span className="font-mono">{instance.phone_number}</span>
                  </div>
                )}

                {instance.profile_picture_url && (
                  <div className="flex justify-center">
                    <img
                      src={instance.profile_picture_url}
                      alt="Perfil"
                      className="h-12 w-12 rounded-full border"
                    />
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  Criado em {new Date(instance.created_at).toLocaleDateString("pt-BR")}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {instance.status === "connected" ? (
                    <>
                      <Button
                        onClick={() => reconnect.mutate(instance.id)}
                        disabled={reconnect.isPending}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        {reconnect.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        onClick={() => disconnect.mutate(instance.id)}
                        disabled={disconnect.isPending}
                        variant="destructive"
                        size="sm"
                        className="flex-1"
                      >
                        {disconnect.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <LogOut className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => reconnect.mutate(instance.id)}
                        disabled={reconnect.isPending}
                        variant="default"
                        size="sm"
                        className="flex-1"
                      >
                        {reconnect.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <QrCode className="h-3 w-3" />
                        )}
                      </Button>
                      <Button
                        onClick={() => disconnect.mutate(instance.id)}
                        disabled={disconnect.isPending}
                        variant="ghost"
                        size="sm"
                        className="flex-1"
                      >
                        {disconnect.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <Phone className="h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground text-center">Nenhuma sessão WhatsApp conectada</p>
            <Button onClick={() => createInstance.mutate()} disabled={createInstance.isPending}>
              {createInstance.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Display */}
      {selectedQrCode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR Code para Escanear
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center space-y-4">
            {selectedQrCode.startsWith("data:") ? (
              <img
                src={selectedQrCode}
                alt="QR Code"
                className="h-64 w-64 border-2 border-gray-200 rounded-lg"
              />
            ) : (
              <div className="text-center w-full">
                <p className="text-sm text-muted-foreground mb-4">
                  Escaneie este código com seu WhatsApp
                </p>
                <div className="text-xs font-mono bg-gray-100 p-4 rounded break-all max-w-sm mx-auto">
                  {selectedQrCode}
                </div>
              </div>
            )}

            <div className="w-full space-y-2">
              <p className="text-sm font-semibold">Como conectar:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Abra o WhatsApp no seu telefone</li>
                <li>Vá para Configurações → Aparelhos conectados</li>
                <li>Clique em "Conectar um aparelho"</li>
                <li>Aponte a câmera para o QR Code</li>
                <li>Aguarde a conexão ser estabelecida</li>
              </ol>
            </div>

            <Button
              onClick={() => setSelectedQrCode(null)}
              variant="outline"
              className="w-full"
            >
              Fechar
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Plan Limits Info */}
      {!canAddMore && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              Limite de Sessões Atingido
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>
              Seu plano atual permite {maxInstances} sessão{maxInstances !== 1 ? "s" : ""}. Para adicionar mais
              sessões, atualize seu plano.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
