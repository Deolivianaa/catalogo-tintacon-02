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
  const safe = filename.replace(/[^a-z0-9_.-]+/gi, "_").slice(0, 80) || "barcode";
  const link = document.createElement("a");
  link.download = `${safe}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

export function printCanvas(canvas: HTMLCanvasElement, title: string) {
  const dataUrl = canvas.toDataURL("image/png");
  const w = window.open("", "_blank", "width=600,height=400");
  if (!w) return;
  const safeTitle = escapeHtml(title);
  w.document.write(
    `<!doctype html><html><head><meta charset="utf-8"><title>${safeTitle}</title></head>` +
      `<body style="display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;">` +
      `<h3>${safeTitle}</h3><img alt="" src="${dataUrl}" />` +
      `<script>window.onload=function(){window.print();setTimeout(function(){window.close();},300);}<\/script>` +
      `</body></html>`,
  );
  w.document.close();
}
