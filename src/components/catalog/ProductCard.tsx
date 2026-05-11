import { memo } from "react";
import type { Product } from "@/types/product";

interface Props {
  product: Product;
  onClick: () => void;
}

function ProductCardImpl({ product, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated"
    >
      <span className="absolute right-3 top-3 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-accent-foreground">
        {product.codigo}
      </span>
      <h3 className="mb-3 pr-16 text-sm font-semibold leading-snug text-foreground line-clamp-2">
        {product.descricao}
      </h3>
      <dl className="space-y-1 text-xs text-muted-foreground">
        {product.codigoFabrica && (
          <div className="flex gap-2">
            <dt>Cód. Fábrica:</dt>
            <dd className="font-medium text-foreground">{product.codigoFabrica}</dd>
          </div>
        )}
        {product.marca && (
          <div className="flex gap-2">
            <dt>Marca:</dt>
            <dd className="font-medium text-foreground">{product.marca}</dd>
          </div>
        )}
        {product.linha && (
          <div className="flex gap-2">
            <dt>Linha:</dt>
            <dd className="font-medium text-foreground">{product.linha}</dd>
          </div>
        )}
      </dl>
      {product.codigoBarras && (
        <div className="mt-3 border-t border-border pt-2 text-xs text-muted-foreground">
          Cód. Barras: <span className="font-mono text-primary">{product.codigoBarras}</span>
        </div>
      )}
    </button>
  );
}

export const ProductCard = memo(ProductCardImpl);
