import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Download, Printer, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { renderBarcode, downloadCanvas, printCanvas } from "@/utils/barcode";
import type { Product } from "@/types/product";

interface Props {
  product: Product | null;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: Props) {
  const variants = product?.variants ?? [];
  const [variantIdx, setVariantIdx] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    setVariantIdx(0);
  }, [product?.id]);

  const variant = variants[variantIdx];
  // Cada variante (UM) tem seu próprio código de barras. Não fazer fallback
  // para o barcode "principal" do produto, pois isso fazia variantes sem
  // código (ex.: CX) exibirem o código da UN.
  const barcode = variant?.codigoBarras || "";

  useEffect(() => {
    if (!product || !barcode) return;
    // wait for dialog mount
    const t = requestAnimationFrame(() => {
      if (canvasRef.current && barcode) {
        try {
          renderBarcode(canvasRef.current, barcode);
        } catch (e) {
          console.warn("barcode error", e);
        }
      }
    });
    return () => cancelAnimationFrame(t);
  }, [product, barcode]);

  const info = useMemo(
    () =>
      product
        ? [
            ["Cód. Fábrica", product.codigoFabrica],
            ["Marca", product.marca],
            ["Linha", product.linha],
            ["Família", product.familia],
            ["Tipo", product.tipo],
            ["Subtipo", product.subtipo],
            ["Fabricante", product.fabricante],
          ].filter(([, v]) => v)
        : [],
    [product],
  );

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg gap-0 overflow-hidden p-0">
        {product && (
          <>
            <div className="p-6 pb-4 pr-12">
              <h2 className="text-base font-semibold leading-tight text-foreground">
                {product.descricao}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">Código: {product.codigo}</p>
            </div>

            <div className="space-y-4 px-6 pb-6">
              <div>
                <label className="mb-2 flex items-center gap-1.5 text-sm font-medium text-foreground">
                  <Box className="h-4 w-4 text-primary" />
                  Unidade de Medida
                </label>
                {variants.length > 1 ? (
                  <Select
                    value={String(variantIdx)}
                    onValueChange={(v) => setVariantIdx(Number(v))}
                  >
                    <SelectTrigger className="h-11 border-primary/40 ring-1 ring-primary/20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {variants.map((v, i) => (
                        <SelectItem key={`${v.um}-${i}`} value={String(i)}>
                          {v.um || "—"} - Cód: {v.codigo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex h-11 items-center rounded-md border border-border bg-muted/40 px-3 text-sm font-medium text-foreground">
                    {variant?.um || "—"}
                  </div>
                )}
              </div>


              <div className="flex min-h-32 items-center justify-center rounded-xl border border-border bg-white p-4">
                {barcode ? (
                  <canvas ref={canvasRef} />
                ) : (
                  <p className="text-sm text-muted-foreground">Sem código de barras</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  disabled={!barcode}
                  onClick={() =>
                    canvasRef.current && downloadCanvas(canvasRef.current, `${product.codigo}-${variant?.um || ""}`)
                  }
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Baixar
                </Button>
                <Button
                  disabled={!barcode}
                  onClick={() => canvasRef.current && printCanvas(canvasRef.current, product.descricao)}
                  className="gap-2 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90"
                >
                  <Printer className="h-4 w-4" />
                  Imprimir
                </Button>
              </div>

              <dl className="divide-y divide-border border-t border-border pt-2 text-sm">
                {info.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-2">
                    <dt className="text-muted-foreground">{k}:</dt>
                    <dd className="text-right font-medium text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
