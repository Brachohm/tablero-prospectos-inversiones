/** Tipo de póliza actual (cambio de seguro) y sus argumentos. */
import { ARGUMENTOS_POLIZA, type ArgumentoPoliza } from "../config/poliza";
import { esCambio, txt } from "./ficha";
import type { Prospecto } from "./tipos";

export type TipoPoliza = "Individual" | "Masivo" | "Corporativo";

export function tipoPolizaDe(p: Prospecto): TipoPoliza | null {
  if (!esCambio(p)) return null;
  const t = txt(p, "tipoPoliza");
  return t === "Individual" || t === "Masivo" || t === "Corporativo" ? t : null;
}

/** Argumentos para su tipo de póliza (null si es individual o no se sabe). */
export function argumentoPoliza(p: Prospecto): (ArgumentoPoliza & { tipo: "Masivo" | "Corporativo" }) | null {
  const t = tipoPolizaDe(p);
  return t === "Masivo" || t === "Corporativo" ? { tipo: t, ...ARGUMENTOS_POLIZA[t] } : null;
}
