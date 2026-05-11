import JsBarcode from "jsbarcode";

export function detectFormat(code: string): string {
  const c = code.replace(/\D/g, "");
  if (c.length === 13) return "EAN13";
  if (c.length === 12) return "UPC";
  if (c.length === 8) return "EAN8";
  return "CODE128";
}

export function renderBarcode(canvas: HTMLCanvasElement, code: string) {
  const format = detectFormat(code);
  const value = format === "CODE128" ? code : code.replace(/\D/g, "");
  JsBarcode(canvas, value, {
    format,
    width: 2,
    height: 80,
    displayValue: true,
    fontSize: 16,
    margin: 10,
    background: "#ffffff",
  });
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a");
  link.download = `${filename}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function printCanvas(canvas: HTMLCanvasElement, title: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const w = window.open("", "_blank", "width=600,height=400");
  if (!w) return;
  w.document.write(`<html><head><title>${title}</title></head><body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;"><h3>${title}</h3><img src="${dataUrl}" /><script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300);}</script></body></html>`);
  w.document.close();
}
