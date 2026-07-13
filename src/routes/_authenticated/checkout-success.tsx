import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2 } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/checkout-success")({
  head: () => ({ meta: [{ title: "Checkout Realizado com Sucesso" }] }),
  component: CheckoutSuccessPage,
});

function CheckoutSuccessPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">Checkout</h1>
        </header>
        <div className="p-6 space-y-6 max-w-2xl">
          <CheckoutSuccessContent />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function CheckoutSuccessContent() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);

  const sessionId = searchParams.session_id as string;

  useEffect(() => {
    const verifyCheckout = async () => {
      try {
        if (!sessionId) {
          setIsSuccess(false);
          return;
        }

        // In a real implementation, you would verify the session with Stripe
        // For now, we'll assume the checkout was successful if we have a session ID
        setIsSuccess(true);

        // Invalidate subscription query to refresh
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (err) {
        console.error("Error verifying checkout:", err);
        setIsSuccess(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyCheckout();
  }, [sessionId]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
          {isSuccess ? "Pagamento Realizado com Sucesso!" : "Erro no Pagamento"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isSuccess ? (
          <>
            <div className="space-y-2">
              <p className="text-muted-foreground">
                Sua assinatura foi ativada com sucesso. Você agora tem acesso a todos os recursos do seu plano.
              </p>
              <p className="text-sm text-muted-foreground">
                ID da Sessão: <code className="bg-muted px-2 py-1 rounded">{sessionId}</code>
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Próximos Passos:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Conecte seu WhatsApp em Configurações</li>
                <li>Configure seu assistente de IA</li>
                <li>Adicione sua base de conhecimento</li>
                <li>Comece a receber mensagens automaticamente</li>
              </ul>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                className="flex-1"
              >
                Ir para Dashboard
              </Button>
              <Button
                onClick={() => navigate({ to: "/whatsapp-connect" })}
                variant="outline"
                className="flex-1"
              >
                Conectar WhatsApp
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="text-muted-foreground">
              Houve um problema ao processar seu pagamento. Por favor, tente novamente.
            </p>
            <Button
              onClick={() => navigate({ to: "/pricing" })}
              className="w-full"
            >
              Voltar para Planos
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
