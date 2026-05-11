import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface FilterState {
  marca: string;
  linha: string;
  familia: string;
  tipo: string;
}

interface Props {
  filters: FilterState;
  options: Record<keyof FilterState, string[]>;
  onChange: (next: FilterState) => void;
}

const LABELS: Record<keyof FilterState, string> = {
  marca: "Marca",
  linha: "Linha",
  familia: "Família",
  tipo: "Tipo",
};

export function Filters({ filters, options, onChange }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground">Filtros</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(LABELS) as (keyof FilterState)[]).map((key) => (
          <div key={key} className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">{LABELS[key]}</label>
            <Select
              value={filters[key]}
              onValueChange={(v) => onChange({ ...filters, [key]: v })}
            >
              <SelectTrigger className="h-10 bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="__all__">{key === "tipo" ? "Todos" : "Todas"}</SelectItem>
                {options[key].map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
