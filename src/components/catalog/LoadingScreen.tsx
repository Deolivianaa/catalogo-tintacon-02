import { Loader2 } from "lucide-react";
import type { ParseProgress } from "@/utils/csv";

interface Props {
  progress: ParseProgress | null;
}

export function LoadingScreen({ progress }: Props) {
  const percent = progress?.percent ?? 0;
  const processed = progress?.processed ?? 0;
  const total = progress?.total ?? 0;

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Loader2 className="h-10 w-10 animate-spin text-primary" strokeWidth={1.5} />
      <p className="text-base font-semibold text-foreground">Carregando produtos...</p>
      <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all duration-200"
          style={{ width: `${Math.max(2, percent)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {total > 0
          ? `${processed.toLocaleString("pt-BR")} de ${total.toLocaleString("pt-BR")} (${percent}%)`
          : "Preparando..."}
      </p>
    </div>
  );
}
