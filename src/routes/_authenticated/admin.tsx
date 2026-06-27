import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlaceholderPage } from "@/components/placeholder-page";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin");
    if (!data || data.length === 0) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Admin — LocalBoost" }] }),
  component: () => <PlaceholderPage title="Painel Administrativo" description="Métricas globais, gestão de usuários, planos e afiliados. Em desenvolvimento." />,
});
