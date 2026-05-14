import { useEffect, useState } from "react";
import { Lock, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PASSWORD = "#nfFbt";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  url: string | null;
}

export function SyncDialog({ open, onClose, onConfirm, url }: Props) {
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (!open) setPwd("");
  }, [open]);

  const tryUnlock = () => {
    if (pwd === PASSWORD) {
      onConfirm();
      onClose();
    } else {
      toast.error("Senha incorreta");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>Sincronizar Catálogo</DialogTitle>
          <DialogDescription>Sincroniza o catálogo a partir da URL salva</DialogDescription>
        </VisuallyHidden>
        <div className="flex items-center gap-2 p-6 pb-3">
          <RefreshCw className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Sincronizar Catálogo</h2>
        </div>

        {!url ? (
          <div className="space-y-4 px-6 pb-6">
            <p className="text-sm text-muted-foreground">
              Nenhuma URL configurada. Importe primeiro via URL para habilitar a sincronização.
            </p>
            <Button onClick={onClose} variant="outline" className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6">
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs">
              <p className="mb-1 font-semibold text-foreground">URL configurada:</p>
              <p className="break-all font-mono text-muted-foreground">{url}</p>
            </div>
            <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 py-6">
              <Lock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Digite a senha para sincronizar</p>
              <Input
                type="password"
                value={pwd}
                onChange={(e) => setPwd(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tryUnlock()}
                className="mx-6 h-11 border-primary/40 ring-1 ring-primary/20"
                autoFocus
              />
            </div>
            <Button
              onClick={tryUnlock}
              className="h-11 w-full gap-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              <RefreshCw className="h-4 w-4" />
              Sincronizar agora
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
