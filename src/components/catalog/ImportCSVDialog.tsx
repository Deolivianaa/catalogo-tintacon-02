import { useEffect, useRef, useState } from "react";
import { FileText, Link2, Lock, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const PASSWORD = "#nfFbt";

interface Props {
  open: boolean;
  onClose: () => void;
  onImport: (source: File | string, opts: { clearBefore: boolean }) => void;
  onClearOnly: () => void;
}

export function ImportCSVDialog({ open, onClose, onImport, onClearOnly }: Props) {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [clearBefore, setClearBefore] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [url, setUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setUnlocked(false);
      setPwd("");
      setClearBefore(false);
      setDragOver(false);
      setUrl("");
    }
  }, [open]);

  const tryUnlock = () => {
    if (pwd === PASSWORD) {
      setUnlocked(true);
    } else {
      toast.error("Senha incorreta");
    }
  };

  const handleFile = (file: File) => {
    onImport(file, { clearBefore });
    onClose();
  };

  const handleUrl = () => {
    const u = url.trim();
    if (!u) {
      toast.error("Informe uma URL");
      return;
    }
    if (!/^https?:\/\//i.test(u)) {
      toast.error("URL deve começar com http:// ou https://");
      return;
    }
    onImport(u, { clearBefore });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <VisuallyHidden>
          <DialogTitle>Importar Produtos</DialogTitle>
          <DialogDescription>Importe produtos via arquivo CSV/XLSX ou URL</DialogDescription>
        </VisuallyHidden>
        <div className="flex items-center gap-2 p-6 pb-3">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Importar Produtos</h2>
        </div>

        <p className="px-6 pb-5 text-sm text-muted-foreground">
          Aceita arquivos <strong>CSV</strong> (separador <code>;</code>) ou <strong>XLSX</strong>{" "}
          (apenas a primeira planilha será lida). Também é possível alimentar via URL pública.
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

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm("Limpar todo o catálogo? Esta ação não pode ser desfeita.")) {
                  onClearOnly();
                  onClose();
                }
              }}
              className="h-11 w-full gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
              Limpar catálogo agora (sem importar)
            </Button>


            <Tabs defaultValue="file" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Arquivo
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="mt-4">
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
                    Arraste um arquivo CSV ou XLSX, ou clique para selecionar
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
                    accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </div>
              </TabsContent>

              <TabsContent value="url" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Informe a URL completa do arquivo CSV ou XLSX. O servidor deve permitir CORS.
                </p>
                <Input
                  type="url"
                  placeholder="https://exemplo.com/produtos.xlsx"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleUrl()}
                  className="h-11"
                />
                <Button
                  onClick={handleUrl}
                  className="h-11 w-full gap-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                >
                  <Link2 className="h-4 w-4" />
                  Importar da URL
                </Button>
              </TabsContent>
            </Tabs>
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
