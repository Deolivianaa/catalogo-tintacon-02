import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { PackageX } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { useDebounce } from "@/hooks/useDebounce";
import { CatalogHeader } from "@/components/catalog/CatalogHeader";
import { SearchBar } from "@/components/catalog/SearchBar";
import { Filters, type FilterState } from "@/components/catalog/Filters";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ProductModal } from "@/components/catalog/ProductModal";
import { Pagination } from "@/components/catalog/Pagination";
import { ImportCSVDialog } from "@/components/catalog/ImportCSVDialog";
import { SyncDialog } from "@/components/catalog/SyncDialog";
import { LoadingScreen } from "@/components/catalog/LoadingScreen";
import type { Product } from "@/types/product";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tintacon — Catálogo de Produtos" },
      { name: "description", content: "Catálogo interno de produtos Tintacon. Busca rápida, filtros e geração de código de barras." },
    ],
  }),
  component: Index,
});

const PAGE_SIZE = 24;
const ALL = "__all__";

function uniqueSorted(arr: string[]): string[] {
  return Array.from(new Set(arr.filter(Boolean))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function Index() {
  const { products, loading, progress, importFile } = useCatalog();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 220);
  const [filters, setFilters] = useState<FilterState>({
    marca: ALL,
    linha: ALL,
    familia: ALL,
    tipo: ALL,
  });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Product | null>(null);

  const options = useMemo(
    () => ({
      marca: uniqueSorted(products.map((p) => p.marca)),
      linha: uniqueSorted(products.map((p) => p.linha)),
      familia: uniqueSorted(products.map((p) => p.familia)),
      tipo: uniqueSorted(products.map((p) => p.tipo)),
    }),
    [products],
  );

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return products.filter((p) => {
      if (filters.marca !== ALL && p.marca !== filters.marca) return false;
      if (filters.linha !== ALL && p.linha !== filters.linha) return false;
      if (filters.familia !== ALL && p.familia !== filters.familia) return false;
      if (filters.tipo !== ALL && p.tipo !== filters.tipo) return false;
      if (!q) return true;
      return (
        p.descricao.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q) ||
        p.codigoFabrica.toLowerCase().includes(q) ||
        p.codigoBarras.toLowerCase().includes(q) ||
        p.variants.some((v) => v.codigoBarras.toLowerCase().includes(q))
      );
    });
  }, [products, debouncedSearch, filters]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page],
  );

  return (
    <div className="min-h-screen bg-background">
      <CatalogHeader total={products.length} onImportClick={() => setImportOpen(true)} />

      {loading ? (
        <LoadingScreen progress={progress} />
      ) : (
        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          <SearchBar value={search} onChange={setSearch} />
          <Filters filters={filters} options={options} onChange={setFilters} />

          <p className="text-sm text-muted-foreground">
            Exibindo{" "}
            <span className="font-semibold text-foreground">
              {filtered.length.toLocaleString("pt-BR")}
            </span>{" "}
            produtos
            {totalPages > 1 && (
              <span className="ml-1">
                (página {page} de {totalPages})
              </span>
            )}
          </p>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
              <PackageX className="h-10 w-10 opacity-50" />
              <p className="text-sm">Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {paged.map((p) => (
                <ProductCard key={p.id} product={p} onSelect={setSelected} />
              ))}
            </div>
          )}

          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </main>
      )}

      <ProductModal product={selected} onClose={() => setSelected(null)} />
      <ImportCSVDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(file, opts) => importFile(file, opts)}
      />
    </div>
  );
}
