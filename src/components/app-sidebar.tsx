import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, SidebarSeparator,
} from "@/components/ui/sidebar";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, MessageSquare, Users, Megaphone, Bot, BarChart3,
  Settings, Smartphone, CreditCard, Shield, LogOut, Workflow,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { useUserRoles } from "@/hooks/use-user-roles";

const NAV = [
  { group: "Operação", items: [
    { to: "/dashboard", label: "Visão geral", icon: LayoutDashboard },
    { to: "/conversations", label: "Conversas", icon: MessageSquare },
    { to: "/contacts", label: "Contatos & CRM", icon: Users },
    { to: "/automations", label: "Automações", icon: Workflow },
  ]},
  { group: "Crescimento", items: [
    { to: "/campaigns", label: "Campanhas", icon: Megaphone },
    { to: "/ai-assistant", label: "Assistente IA", icon: Bot },
    { to: "/reports", label: "Relatórios", icon: BarChart3 },
  ]},
  { group: "Conta", items: [
    { to: "/whatsapp", label: "WhatsApp", icon: Smartphone },
    { to: "/billing", label: "Assinatura", icon: CreditCard },
    { to: "/settings", label: "Configurações", icon: Settings },
  ]},
] as const;

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAdmin } = useUserRoles();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    toast.success("Você saiu da conta");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4"><Logo /></SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        {NAV.map((g) => (
          <SidebarGroup key={g.group}>
            <SidebarGroupLabel>{g.group}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {g.items.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <SidebarMenuItem key={item.to}>
                      <SidebarMenuButton asChild isActive={active}>
                        <Link to={item.to}><item.icon className="h-4 w-4" /><span>{item.label}</span></Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/admin"}>
                    <Link to="/admin"><Shield className="h-4 w-4" /><span>Painel Admin</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === "/admin/plans"}>
                    <Link to="/admin/plans"><CreditCard className="h-4 w-4" /><span>Planos & Preços</span></Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="p-3 flex flex-row items-center justify-between gap-2">
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" /> Sair
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
