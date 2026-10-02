/** Fechas en formato ISO local (AAAA-MM-DD). `hoy` se inyecta para poder probar. */

export function hoyISO(d: Date = new Date()): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Días desde `hoy` hasta `iso` (negativo si ya pasó). */
export function diasHasta(iso: string, hoy: string = hoyISO()): number {
  const a = Date.parse(iso + "T00:00:00Z");
  const b = Date.parse(hoy + "T00:00:00Z");
  return Math.round((a - b) / 86400000);
}

export function fmtFecha(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  return `${Number(m[3])} ${meses[Number(m[2]) - 1]} ${m[1]}`;
}

export function usd(n: number): string {
  return "$" + (Math.round(n * 100) / 100).toFixed(2).replace(/\.00$/, "");
}
