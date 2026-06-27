import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Construction } from "lucide-react";

export function PlaceholderPage({ title, description }: { title: string; description: string }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger />
          <h1 className="font-semibold">{title}</h1>
        </header>
        <div className="p-6">
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4"><Construction className="h-8 w-8 text-primary" /></div>
              <div>
                <h2 className="text-xl font-semibold">{title}</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
