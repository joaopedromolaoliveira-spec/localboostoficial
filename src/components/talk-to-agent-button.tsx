import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

const AGENT_URL = "https://wa.me/14997483168?text=" + encodeURIComponent("Olá! Quero falar com o agente IA da LocalBoost.");

export function TalkToAgentButton({ label = "Falar com o agente IA", full = false }: { label?: string; full?: boolean }) {
  return (
    <Button asChild variant="default" className={`gap-2 bg-[#25D366] text-white hover:bg-[#1fb857] ${full ? "w-full" : ""}`}>
      <a href={AGENT_URL} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-4 w-4" /> {label}
      </a>
    </Button>
  );
}
