import { useEffect, useRef, useState } from "react";
import { FileText, Lock, Trash2, Upload, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const PASSWORD = "tintacon";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (file: File, opts: { clearBefore: boolean }) => void;
}

export function ImportCSVDialog({ open, onClose, onImport }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [clearBefore, setClearBefore] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setPwd("");
      setClearBefore(false);
      setDragOver(false);
    }
  }, [open]);

  const tryUnlock = () => {
    if (pwd.trim().toLowerCase() === PASSWORD) {
      setUnlocked(true);
    } else {
      toast.error("Senha incorreta");
    }
  };

  const handleFile = (file: File) => {
    onImport(file, { clearBefore });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="flex items-start justify-between p-6 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Importar Produtos via CSV</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="px-6 pb-5 text-sm text-muted-foreground">
          Faça upload de um arquivo CSV com o mesmo formato do relatório original. O arquivo deve
          usar ponto-e-vírgula (;) como separador.
        </p>

        {!unlocked ? (
          <div className="space-y-4 px-6 pb-6">
            <div className="flex flex-col items-center gap-3 rounded-xl bg-muted/40 py-6">
              <Lock className="h-10 w-10 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                Digite a senha para acessar a importação
              </p>
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
              className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              Acessar
            </Button>
          </div>
        ) : (
          <div className="space-y-4 px-6 pb-6">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/60 px-4 py-3 text-sm font-medium text-amber-700">
              <input
                type="checkbox"
                checked={clearBefore}
                onChange={(e) => setClearBefore(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
              <Trash2 className="h-4 w-4" />
              Limpar catálogo antes de importar
            </label>

            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const f = e.dataTransfer.files?.[0];
                if (f) handleFile(f);
              }}
              className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30 hover:border-primary/40"
              }`}
            >
              <Upload className="h-8 w-8 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">
                Arraste um arquivo CSV ou clique para selecionar
              </p>
              <Button
                type="button"
                className="bg-gradient-to-r from-primary-glow to-primary text-primary-foreground"
              >
                Selecionar arquivo
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </div>
        )}

        <div className="border-t border-border bg-muted/30 px-6 py-4 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Formato esperado (colunas):</p>
          <p className="font-mono leading-relaxed">
            CÓDIGO; DESCRIÇÃO; CÓDIGOCLASSIFICAÇÃO; CLASSIFICAÇÃO; MODELO; UM; CÓDIGOBARRAS;
            CÓDIGOFÁBRICA; MARCA; LINHA; FAMÍLIA; TIPO; SUBTIPO
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
