/**
 * Extrae el texto de un PDF, página por página, en el propio dispositivo
 * (pdf.js). Se carga solo al subir un documento.
 * Los PDF escaneados (fotos) no tienen texto: devuelven páginas vacías.
 */
import { limpiarTexto } from "../domain/biblioteca";

export async function textoDePDF(datos: ArrayBuffer, alAvanzar?: (pag: number, total: number) => void): Promise<string[]> {
  const [pdfjs, worker] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(datos) }).promise;
  const paginas: string[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const pag = await doc.getPage(i);
      const contenido = await pag.getTextContent();
      let t = "";
      for (const it of contenido.items) {
        if (!("str" in it)) continue;
        t += it.str + (it.hasEOL ? "\n" : " ");
      }
      paginas.push(limpiarTexto(t));
      pag.cleanup();
      alAvanzar?.(i, doc.numPages);
    }
  } finally {
    void doc.destroy();
  }
  return paginas;
}
