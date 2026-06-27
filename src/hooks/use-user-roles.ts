import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useUserRoles() {
  const { data: roles = [], isLoading } = useQuery({
    queryKey: ["user-roles"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      if (error) return [];
      return data.map((r) => r.role);
    },
  });
  return {
    roles,
    isLoading,
    isAdmin: roles.includes("admin"),
    isManager: roles.includes("manager"),
    isPartner: roles.includes("partner"),
    hasRole: (r: string) => roles.includes(r as any),
  };
}
