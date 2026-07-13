import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2, AlertCircle } from "lucide-react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/pricing")({
  head: () => ({ meta: [{ title: "Planos e Preços" }] }),
  component: PricingPage,
});

interface Plan {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  instances: number;
  features: string[];
}

interface Subscription {
  plan: string;
  status: string;
  current_period_end: string;
}

function PricingPage() {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">Planos e Preços</h1>
        </header>
        <div className="p-6 space-y-6 max-w-6xl">
          <PricingSection />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["stripe-plans"],
    queryFn: async () => {
      const response = await fetch("/api/stripe?action=plans");
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      return data.plans as Plan[];
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const response = await fetch("/api/stripe?action=subscriptions");
      if (!response.ok) return null;
      const data = await response.json();
      return data.subscription as Subscription;
    },
  });

  const checkout = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await fetch("/api/stripe?action=create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          interval: billingInterval,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao criar checkout");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatPrice = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  };

  if (plansLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!plans || plans.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <AlertCircle className="h-6 w-6 mr-2" />
          <span>Nenhum plano disponível</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={billingInterval === "month" ? "font-semibold" : "text-muted-foreground"}>
          Mensal
        </span>
        <button
          onClick={() => setBillingInterval(billingInterval === "month" ? "year" : "month")}
          className="relative inline-flex h-8 w-14 items-center rounded-full bg-muted"
        >
          <span
            className={`inline-block h-6 w-6 transform rounded-full bg-background transition-transform ${
              billingInterval === "year" ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
        <span className={billingInterval === "year" ? "font-semibold" : "text-muted-foreground"}>
          Anual
          <Badge variant="secondary" className="ml-2">
            Economize 17%
          </Badge>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const price = billingInterval === "month" ? plan.monthlyPrice : plan.yearlyPrice;
          const period = billingInterval === "month" ? "/mês" : "/ano";
          const isCurrentPlan = subscription?.plan === plan.id;

          return (
            <Card
              key={plan.id}
              className={`relative transition-all ${
                isCurrentPlan ? "ring-2 ring-primary" : ""
              }`}
            >
              {isCurrentPlan && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  Plano Atual
                </Badge>
              )}

              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Price */}
                <div>
                  <div className="text-3xl font-bold">
                    {formatPrice(price)}
                    <span className="text-lg text-muted-foreground font-normal">{period}</span>
                  </div>
                </div>

                {/* Instances */}
                <div className="text-sm text-muted-foreground">
                  {plan.instances === -1
                    ? "Instâncias WhatsApp ilimitadas"
                    : `${plan.instances} instância${plan.instances !== 1 ? "s" : ""} WhatsApp`}
                </div>

                {/* Features */}
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                {isCurrentPlan ? (
                  <Button disabled className="w-full">
                    Plano Atual
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      // Determine which price ID to use based on interval
                      const priceId = billingInterval === "month" 
                        ? `price_${plan.id}_monthly` 
                        : `price_${plan.id}_yearly`;
                      checkout.mutate(priceId);
                    }}
                    disabled={checkout.isPending}
                    className="w-full"
                  >
                    {checkout.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Escolher Plano
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Current Subscription Info */}
      {subscription && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base">Sua Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Plano</p>
                <p className="font-semibold capitalize">{subscription.plan}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge
                  variant={
                    subscription.status === "active"
                      ? "default"
                      : subscription.status === "past_due"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {subscription.status}
                </Badge>
              </div>
              {subscription.current_period_end && (
                <div>
                  <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                  <p className="font-semibold">
                    {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}
            </div>

            <ManageSubscriptionButton />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ManageSubscriptionButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleManageSubscription = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/stripe?action=create-portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao abrir portal");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao abrir portal");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleManageSubscription}
      disabled={isLoading}
      variant="outline"
      className="w-full"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : null}
      Gerenciar Assinatura
    </Button>
  );
}
