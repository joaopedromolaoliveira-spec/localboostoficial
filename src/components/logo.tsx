import { Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "text-lg", md: "text-xl", lg: "text-2xl" }[size];
  const icon = { sm: 18, md: 22, lg: 28 }[size];
  return (
    <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-hero shadow-glow">
        <MessageCircle size={icon} className="text-primary-foreground" strokeWidth={2.5} />
      </span>
      <span className={sizes}>
        Local<span className="text-gradient">Boost</span>
      </span>
    </Link>
  );
}
