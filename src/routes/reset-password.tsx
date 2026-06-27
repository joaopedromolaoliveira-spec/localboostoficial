import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Nova senha — LocalBoost" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) { toast.error("Senha deve ter no mínimo 8 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Senha atualizada!");
    navigate({ to: "/dashboard" });
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center"><Logo size="lg" /></div>
        <Card className="shadow-card"><CardContent className="p-6">
          <h1 className="text-xl font-semibold">Definir nova senha</h1>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2"><Label htmlFor="rp-pass">Nova senha</Label><Input id="rp-pass" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar nova senha"}</Button>
          </form>
        </CardContent></Card>
      </div>
    </div>
  );
}
