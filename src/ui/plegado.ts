/**
 * Secciones desplegables de la ficha: cada título abre o pliega su sección.
 * La ficha decide cuáles empiezan abiertas (las de la etapa en curso).
 */
import { createContext, useContext } from "react";

export interface Plegado {
  abierta: (seccion: string) => boolean;
  alternar: (seccion: string) => void;
}

export const PlegadoContext = createContext<Plegado | null>(null);

/** Clase extra para la sección (" plegado" si está cerrada) y su estado. */
export function usePlegado(seccion: string): { abierta: boolean; clase: string; alternar?: () => void } {
  const ctx = useContext(PlegadoContext);
  if (!ctx) return { abierta: true, clase: "" };
  const abierta = ctx.abierta(seccion);
  return { abierta, clase: abierta ? "" : " plegado", alternar: () => ctx.alternar(seccion) };
}
