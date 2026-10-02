/** Filtros y orden de la lista de prospectos. */
import { ETAPA_PERDIDO } from "../config/ficha";
import { etapaDe, tipoDe, txt, vendido } from "./ficha";
import { hoyISO } from "./fechas";
import type { Prospecto, Tipo } from "./tipos";

export type FiltroTipo = "Todos" | Tipo;

export interface Filtros {
  tipo: FiltroTipo;
  /** "Todos" o una etapa. */
  etapa: string;
}

/** El próximo contacto venció (hoy incluido) y la ficha sigue abierta. */
export function contactoVencido(p: Prospecto, hoy: string = hoyISO()): boolean {
  const prox = txt(p, "prox");
  const et = etapaDe(p);
  return !!prox && prox <= hoy && !vendido(p) && et !== ETAPA_PERDIDO;
}

/** Primero por próximo contacto (el más cercano arriba, sin fecha al final), luego por creación descendente. */
export function ordenar(items: readonly Prospecto[]): Prospecto[] {
  return [...items].sort((a, b) => {
    const ad = txt(a, "prox") || "9999";
    const bd = txt(b, "prox") || "9999";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return (b.creado || 0) - (a.creado || 0);
  });
}

export function filtrar(items: readonly Prospecto[], f: Filtros): Prospecto[] {
  return items.filter(
    (p) => (f.tipo === "Todos" || tipoDe(p) === f.tipo) && (f.etapa === "Todos" || etapaDe(p) === f.etapa),
  );
}
