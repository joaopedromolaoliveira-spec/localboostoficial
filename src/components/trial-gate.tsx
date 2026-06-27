import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useUserRoles } from "@/hooks/use-user-roles";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, CreditCard } from "lucide-react";

const ALLOWED = ["/billing", "/settings", "/admin", "/admin/plans"];

export function TrialGate({ children }: { children: React.ReactNode }) {
  const { isAdmin, isManager, isPartner, isLoading: rolesLoading } = useUserRoles();
  const location = useLocation();

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscription", "gate"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("subscriptions").select("plan, status, current_period_end").eq("user_id", user.id).maybeSingle();
      return data;
    },
    refetchInterval: 60_000,
  });

  if (isLoading || rolesLoading) return <>{children}</>;
  if (isAdmin || isManager || isPartner) return <>{children}</>;

  const expired =
    sub &&
    sub.plan === "trial" &&
    sub.status !== "active" &&
    sub.current_period_end &&
    new Date(sub.current_period_end).getTime() < Date.now();

  if (!expired) return <>{children}</>;
  if (ALLOWED.some((p) => location.pathname === p || location.pathname.startsWith(`${p}/`))) return <>{children}</>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-lg shadow-glow">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Lock className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle>Seu período de teste terminou</CardTitle>
          <CardDescription>
            Para continuar usando o LocalBoost, escolha um plano a partir do Starter.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full gap-2 shadow-glow" size="lg">
            <Link to="/billing"><CreditCard className="h-4 w-4" /> Ver planos e assinar</Link>
          </Button>
          <Button asChild variant="ghost" className="w-full">
            <Link to="/settings">Ajustar perfil</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
