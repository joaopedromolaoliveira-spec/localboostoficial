import { createFileRoute, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  // Block users whose trial expired and who don't have an active paid plan
  // (admins/managers/partners are always allowed — their plan is auto-elevated).
  const { data: gate } = useQuery({
    queryKey: ["plan-gate"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { blocked: false };
      const [{ data: roles }, { data: sub }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("subscriptions").select("plan,status,current_period_end").eq("user_id", user.id).maybeSingle(),
      ]);
      const elevated = (roles ?? []).some((r) => ["admin", "manager", "partner"].includes(r.role as string));
      if (elevated) return { blocked: false };
      if (!sub) return { blocked: false };
      const end = sub.current_period_end ? new Date(sub.current_period_end).getTime() : 0;
      const expired = sub.status === "trialing" && end < Date.now();
      const paid = sub.status === "active" && sub.plan !== "trial";
      return { blocked: expired && !paid };
    },
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (gate?.blocked && location.pathname !== "/billing") {
      navigate({ to: "/billing", replace: true });
    }
  }, [gate?.blocked, location.pathname, navigate]);

  return <Outlet />;
}
