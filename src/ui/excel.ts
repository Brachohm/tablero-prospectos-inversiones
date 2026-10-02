/** Lee la primera hoja de un Excel (.xlsx) o un CSV, en el dispositivo. */
import { leerCSV, type Celda } from "../domain/importar";

export async function leerHoja(f: File): Promise<Celda[][]> {
  if (/\.(csv|txt)$/i.test(f.name) || f.type === "text/csv") return leerCSV(await f.text());
  const { readSheet } = await import("read-excel-file/universal");
  return (await readSheet(await f.arrayBuffer())) as Celda[][];
}
