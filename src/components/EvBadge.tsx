import { Badge } from "@/components/ui/badge";
import { classifyEV, formatPct } from "@/lib/ev";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export function EvBadge({ ev, compact = false }: { ev: number | null | undefined; compact?: boolean }) {
  const cls = classifyEV(ev);
  const map = {
    positive: { label: "+EV", icon: TrendingUp, className: "bg-primary/15 text-primary border-primary/30" },
    negative: { label: "-EV", icon: TrendingDown, className: "bg-destructive/15 text-destructive border-destructive/30" },
    neutral: { label: "≈EV", icon: Minus, className: "bg-muted text-muted-foreground border-border" },
  } as const;
  const v = map[cls];
  const Icon = v.icon;
  return (
    <Badge variant="outline" className={`gap-1 font-mono ${v.className}`}>
      <Icon className="h-3 w-3" />
      {compact ? v.label : `${v.label} ${formatPct(ev)}`}
    </Badge>
  );
}
