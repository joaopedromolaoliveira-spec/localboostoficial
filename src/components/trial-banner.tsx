import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";

export function TrialBanner() {
  const { data: sub } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase.from("subscriptions").select("*").eq("user_id", user.id).maybeSingle();
      return data;
    },
  });

  if (!sub || sub.status !== "trialing" || !sub.trial_ends_at) return null;
  const daysLeft = Math.max(0, Math.ceil((new Date(sub.trial_ends_at).getTime() - Date.now()) / 86400000));

  return (
    <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/15 p-2"><Sparkles className="h-5 w-5 text-primary" /></div>
          <div>
            <p className="font-semibold">Você está no período de teste — {daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}</p>
            <p className="text-sm text-muted-foreground">Escolha um plano para não perder seus dados e automações.</p>
          </div>
        </div>
        <Button asChild className="shadow-glow"><Link to="/billing">Ver planos</Link></Button>
      </CardContent>
    </Card>
  );
}
