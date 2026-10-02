/**
 * Cadena de mensajes para referidos: el asesor activa cada paso; se guarda
 * el día en que envió cada uno (`cadena[i]` = día del paso i+1).
 */
import { ajustarSaludo, saludoMensaje } from "./inicio";
import { CADENA_REFERIDO, RELACIONES } from "../config/referidos";
import { mensajeDe, perfilDe, type Ajustes, type ClaveMensaje, type Perfil } from "./ajustes";

export interface DatosReferido {
  nombre: string;
  referidor: string;
  relacion: string;
  cadena?: (string | null)[];
}

export interface PasoCadena {
  /** 1, 2, 3… */
  n: number;
  l: string;
  texto: string;
  opcional: boolean;
  /** Día en que se envió, o null. */
  enviado: string | null;
  /** Se puede enviar (el anterior ya se envió). */
  disponible: boolean;
}

const primero = (s: string) => s.trim().split(/\s+/)[0] ?? "";

export function fraseRelacion(relacion: string): string {
  const f = RELACIONES.find((r) => r.l === relacion)?.frase ?? "";
  return f ? `, ${f},` : "";
}

/** Texto del paso `i`: el que escribiste en Configuración → Referidos, o el de fábrica. */
export function plantillaPaso(i: number, a?: Ajustes): string {
  return a ? mensajeDe(a, `ref${i + 1}` as ClaveMensaje).texto : CADENA_REFERIDO[i].t;
}

export function textoPaso(i: number, d: DatosReferido, perfil: Perfil = perfilDe(undefined), a?: Ajustes): string {
  const v: Record<string, string> = {
    nombre: primero(d.nombre),
    asesor: perfil.apodo,
    rol: perfil.rol,
    referidor: primero(d.referidor) || "Una persona que le aprecia",
    relacion: fraseRelacion(d.relacion),
    saludo: saludoMensaje(),
  };
  return ajustarSaludo(plantillaPaso(i, a), new Date().getHours())
    .replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? "")
    .replace(/¿Tengo el gusto de hablar con \?/, "¿Cómo está?")
    .replace(/¡Qué gusto saludarle, !/, "¡Qué gusto saludarle!")
    .replace(/Hola ,/, "Hola,")
    .replace(/,,/g, ",")
    .replace(/ {2,}/g, " ")
    .trim();
}

export function pasosCadena(d: DatosReferido, perfil?: Perfil, a?: Ajustes): PasoCadena[] {
  const c = d.cadena ?? [];
  return CADENA_REFERIDO.map((p, i) => ({
    n: i + 1,
    l: p.l,
    texto: textoPaso(i, d, perfil, a),
    opcional: !!p.opcional,
    enviado: c[i] ?? null,
    disponible: i === 0 || !!c[i - 1],
  }));
}

/** Siguiente paso obligatorio sin enviar (null si ya se enviaron). */
export function siguientePaso(d: DatosReferido): PasoCadena | null {
  return pasosCadena(d).find((p) => !p.opcional && !p.enviado && p.disponible) ?? null;
}

export function cadenaCompleta(d: DatosReferido): boolean {
  return siguientePaso(d) === null;
}

export function marcarPaso(cadena: (string | null)[] | undefined, i: number, dia: string | null): (string | null)[] {
  const c = [...(cadena ?? [])];
  while (c.length <= i) c.push(null);
  c[i] = dia;
  while (c.length && c[c.length - 1] === null) c.pop();
  return c;
}

export function esReferido(d: { referidor?: string }): boolean {
  return !!d.referidor?.trim();
}
