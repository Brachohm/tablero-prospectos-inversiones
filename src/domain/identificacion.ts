/**
 * Identificación de cada asegurado para la contratación: número (cédula o
 * pasaporte), fecha de emisión y de expiración del documento. La cédula
 * ecuatoriana se revisa con su dígito verificador; un pasaporte (letras y
 * números) se acepta tal cual. Son avisos para corregir a tiempo: no bloquean.
 */
import { diasHasta } from "./fechas";
import type { Persona } from "./tipos";

/** Días antes de la expiración en que se avisa "por vencer". */
export const AVISO_EXPIRA_DIAS = 60;

/** Cédula ecuatoriana: 10 dígitos, provincia 01-24 (o 30) y dígito verificador (módulo 10). */
export function cedulaValida(s: string): boolean {
  const d = s.replace(/\D/g, "");
  if (d.length !== 10 || d !== s.trim().replace(/[\s-]/g, "")) return false;
  const prov = Number(d.slice(0, 2));
  if (!((prov >= 1 && prov <= 24) || prov === 30)) return false;
  if (Number(d[2]) > 5) return false;
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let x = Number(d[i]) * (i % 2 === 0 ? 2 : 1);
    if (x > 9) x -= 9;
    suma += x;
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(d[9]);
}

export interface EstadoIdentificacion {
  /** Datos que faltan: "número", "fecha de emisión", "fecha de expiración". */
  falta: string[];
  /** Avisos a revisar (no bloquean). */
  avisos: string[];
  completo: boolean;
}

export function estadoIdentificacion(per: Persona, hoy: string): EstadoIdentificacion {
  const num = (per.ident ?? "").trim();
  const emi = (per.identEmision ?? "").trim();
  const exp = (per.identExpira ?? "").trim();
  const falta: string[] = [];
  if (!num) falta.push("número");
  if (!emi) falta.push("fecha de emisión");
  if (!exp) falta.push("fecha de expiración");
  const avisos: string[] = [];
  if (num && /^\d+$/.test(num.replace(/[\s-]/g, "")) && !cedulaValida(num))
    avisos.push("La cédula no es válida: revisa los 10 dígitos");
  if (emi && diasHasta(emi, hoy) > 0) avisos.push("La fecha de emisión está en el futuro");
  if (emi && exp && exp <= emi) avisos.push("La expiración debe ser posterior a la emisión");
  if (exp) {
    const d = diasHasta(exp, hoy);
    if (d < 0) avisos.push("El documento está vencido: pide que lo renueve antes de contratar");
    else if (d <= AVISO_EXPIRA_DIAS) avisos.push(`El documento vence en ${d} ${d === 1 ? "día" : "días"}`);
  }
  return { falta, avisos, completo: falta.length === 0 };
}
