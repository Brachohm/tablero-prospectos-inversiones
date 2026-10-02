/** Datos recabados de una ficha (los usan el análisis y sus mínimos para opinar). */
import { CAMPOS_FICHA } from "../config/ficha";
import { campoActivo, contactosDe, motivosDe, valorLleno } from "./ficha";
import type { Prospecto } from "./tipos";

/** Etiquetas de campos que no son datos del cliente (la etapa). */
const NO_CUENTAN = new Set(
  CAMPOS_FICHA.filter((c) => c.noCount).map((c) => c.k),
);

/**
 * Campos llenos que aplican a la ficha, sin contar la etapa, los checks de la
 * presentación ni el nombre y WhatsApp (no dicen nada del caso).
 */
export function datosRecabados(p: Prospecto): string[] {
  const out: string[] = [];
  for (const c of CAMPOS_FICHA) {
    if (
      !campoActivo(c, p) ||
      NO_CUENTAN.has(c.k) ||
      c.t === "check" ||
      c.k === "nombre" ||
      c.k === "whatsapp"
    )
      continue;
    if (
      c.t === "motivos"
        ? motivosDe(p).length > 0
        : c.t === "contactos"
          ? contactosDe(p) > 0
          : valorLleno(c, p)
    )
      out.push(c.k);
  }
  return out;
}

export function contarDatos(p: Prospecto): number {
  return datosRecabados(p).length;
}
