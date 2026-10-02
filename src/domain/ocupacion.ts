/**
 * Riesgos laborales y ergonómicos según la ocupación: para que la persona
 * vea qué atención podría necesitar y para reforzar el valor del seguro.
 */
import { PERFIL_GENERAL, PERFILES_OCUPACION, type PerfilOcupacion } from "../config/ocupaciones";
import { normalizar, type Argumento } from "./biblioteca";
import { txt } from "./ficha";
import type { Prospecto } from "./tipos";

/** Grupo de riesgos de una ocupación escrita a mano (general si no coincide). */
export function perfilOcupacion(ocupacion: string): PerfilOcupacion {
  const n = normalizar(ocupacion);
  return PERFILES_OCUPACION.find((x) => x.claves.some((k) => n.includes(k))) ?? PERFIL_GENERAL;
}

export interface RiesgosFicha {
  ocupacion: string;
  perfil: PerfilOcupacion;
}

/** Riesgos de la ficha, o null si aún no se registró la ocupación. */
export function riesgosDe(p: Prospecto): RiesgosFicha | null {
  const ocupacion = txt(p, "ocupacion");
  if (!ocupacion) return null;
  return { ocupacion, perfil: perfilOcupacion(ocupacion) };
}

/** Los riesgos más altos primero (para el gráfico y los argumentos). */
export function riesgosPrincipales(r: RiesgosFicha, n = 3): string[] {
  return [...r.perfil.laborales, ...r.perfil.ergonomicos]
    .sort((a, b) => b.nivel - a.nivel)
    .slice(0, n)
    .map((x) => x.t);
}

/** Argumento de cierre según su trabajo (se suma a los de la ficha). */
export function argumentoOcupacion(p: Prospecto): Argumento | null {
  const r = riesgosDe(p);
  if (!r) return null;
  return {
    id: "auto-ocupacion",
    titulo: `Por su trabajo (${r.ocupacion}): ${riesgosPrincipales(r, 2).join(" y ").toLowerCase()}`,
    texto: `${r.perfil.argumento} Lo que más podría necesitar: ${r.perfil.atencion.join(", ").toLowerCase()} (validar coberturas con la aseguradora).`,
    etiquetas: ["general", "emergencia"],
    fuente: "Riesgos frecuentes de su ocupación",
    creado: 0,
    mod: 0,
  };
}
