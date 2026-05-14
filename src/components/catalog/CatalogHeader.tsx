import { RefreshCw, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo-tintacon.png";

interface Props {
  total: number;
  onImportClick: () => void;
  onSyncClick: () => void;
  syncEnabled: boolean;
}

export function CatalogHeader({ total, onImportClick, onSyncClick, syncEnabled }: Props) {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-4">
          <img src={logo} alt="Tintacon" className="h-10 w-auto sm:h-12" />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Catálogo de Produtos
            </h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              <span className="font-semibold text-foreground">
                {total.toLocaleString("pt-BR")}
              </span>{" "}
              produtos disponíveis
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={onSyncClick}
            disabled={!syncEnabled}
            title={syncEnabled ? "Sincronizar catálogo" : "Importe via URL primeiro para habilitar a sincronização"}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar
          </Button>
          <Button variant="outline" onClick={onImportClick} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
        </div>
      </div>
    </header>
  );
}
