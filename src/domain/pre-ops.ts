/**
 * Operaciones del escáner de preexistencias. Todas son puras: reciben una ficha
 * y devuelven una copia modificada (sin tocar `mod`, que pone el almacén).
 */
import { ZONAS } from "../config/zonas";
import { estadoPersona, estadoZona, hitsPersona, personasDe, TITULAR_ID, zonaDe, zonasPendientes } from "./pre";
import type { DatoZona, DetalleCondicion, Persona, Prospecto, Sexo } from "./tipos";

export const MAX_PERSONAS = 10;

function clonar(p: Prospecto): Prospecto {
  return structuredClone(p);
}

/** Personas guardadas en la ficha, con el titular siempre primero (para guardar su sexo). */
function personasMut(p: Prospecto): Persona[] {
  const lista = Array.isArray(p.personas) ? p.personas : [];
  if (!lista.some((x) => x.id === TITULAR_ID)) lista.unshift({ id: TITULAR_ID, rol: "Titular", nombre: "", edad: "", sexo: "" });
  p.personas = lista;
  return lista;
}

function zonaMut(p: Prospecto, pid: string, zid: string): DatoZona {
  p.pre ??= {};
  p.pre[pid] ??= {};
  p.pre[pid][zid] ??= { it: {} };
  p.pre[pid][zid].it ??= {};
  return p.pre[pid][zid];
}

function quitarDatos(p: Prospecto, pid: string) {
  if (p.pre) delete p.pre[pid];
  if (p.preSN) delete p.preSN[pid];
}

let sec = 0;
function idPersona(): string {
  sec = (sec + 1) % 1000;
  return "x" + Date.now().toString(36) + sec.toString(36);
}

/** La persona tiene algo que se perdería al quitarla. */
export function personaConDatos(p: Prospecto, pid: string): boolean {
  return estadoPersona(p, pid) !== "pend";
}

export function setNumeroPersonas(p0: Prospecto, n: number): Prospecto {
  const p = clonar(p0);
  const objetivo = Math.max(1, Math.min(MAX_PERSONAS, Math.floor(n)));
  const lista = personasMut(p);
  while (lista.length < objetivo) lista.push({ id: idPersona(), rol: "Hijo(a)", nombre: "", edad: "", sexo: "" });
  while (lista.length > objetivo) quitarDatos(p, lista.pop()!.id);
  return p;
}

export function quitarPersona(p0: Prospecto, pid: string): Prospecto {
  if (pid === TITULAR_ID) return p0;
  const p = clonar(p0);
  p.personas = personasMut(p).filter((x) => x.id !== pid);
  quitarDatos(p, pid);
  return p;
}

export type CampoPersona =
  | "rol"
  | "nombre"
  | "edad"
  | "sexo"
  | "talla"
  | "tallaU"
  | "peso"
  | "pesoU"
  | "ident"
  | "identEmision"
  | "identExpira";

/** Edita una persona. El nombre y la edad del titular son los de la ficha. */
export function editarPersona(p0: Prospecto, pid: string, campo: CampoPersona, valor: string): Prospecto {
  const p = clonar(p0);
  if (pid === TITULAR_ID && (campo === "nombre" || campo === "edad")) {
    p[campo] = valor;
    return p;
  }
  const per = personasMut(p).find((x) => x.id === pid);
  if (!per) return p0;
  if (campo === "sexo") per.sexo = (valor === "Mujer" || valor === "Hombre" ? valor : "") as Sexo;
  else if (campo === "tallaU") per.tallaU = valor === "cm" ? "cm" : "m";
  else if (campo === "pesoU") per.pesoU = valor === "lb" ? "lb" : "kg";
  else per[campo] = valor;
  return p;
}

/** "No, ninguna". No se permite si ya hay condiciones declaradas (devuelve null). */
export function responderNo(p0: Prospecto, pid: string): Prospecto | null {
  if (hitsPersona(p0, pid) > 0) return null;
  const p = clonar(p0);
  p.preSN = { ...p.preSN, [pid]: "no" };
  return p;
}

export function responderSi(p0: Prospecto, pid: string): Prospecto {
  const p = clonar(p0);
  p.preSN = { ...p.preSN, [pid]: "si" };
  return p;
}

/** Marcar una condición apaga "sin antecedentes" en la zona. Desmarcarla borra su detalle. */
export function marcarCondicion(p0: Prospecto, pid: string, zid: string, cid: string, on: boolean): Prospecto {
  const p = clonar(p0);
  const d = zonaMut(p, pid, zid);
  if (on) {
    d.it![cid] ??= { a: "", e: "", t: "" };
    d.ok = false;
  } else delete d.it![cid];
  return p;
}

export function detalleCondicion(
  p0: Prospecto,
  pid: string,
  zid: string,
  cid: string,
  campo: keyof DetalleCondicion,
  valor: string,
): Prospecto {
  const p = clonar(p0);
  const it = zonaMut(p, pid, zid).it![cid];
  if (!it) return p0;
  (it as Record<string, string>)[campo] = valor;
  return p;
}

export function setOtra(p0: Prospecto, pid: string, zid: string, texto: string): Prospecto {
  const p = clonar(p0);
  const d = zonaMut(p, pid, zid);
  d.otra = texto;
  if (texto.trim()) d.ok = false;
  return p;
}

/** Alterna "sin antecedentes en esta zona" (solo si la zona no tiene condiciones). */
export function alternarZonaLimpia(p0: Prospecto, pid: string, zid: string): Prospecto {
  if (estadoZona(zonaDe(p0, pid, zid)) === "hit") return p0;
  const p = clonar(p0);
  const d = zonaMut(p, pid, zid);
  d.ok = !d.ok;
  return p;
}

/** "El resto sin antecedentes": marca como limpias todas las zonas pendientes. */
export function restoSinAntecedentes(p0: Prospecto, pid: string): Prospecto {
  const p = clonar(p0);
  for (const z of ZONAS) if (estadoZona(zonaDe(p, pid, z.id)) === "pend") zonaMut(p, pid, z.id).ok = true;
  return p;
}

/** Zona siguiente o anterior (circular). Con `soloPendientes`, salta a la próxima sin revisar. */
export function otraZona(p: Prospecto, pid: string, zid: string, dir: 1 | -1, soloPendientes = false): string {
  const n = ZONAS.length;
  const i = Math.max(0, ZONAS.findIndex((z) => z.id === zid));
  if (soloPendientes) {
    for (let k = 1; k <= n; k++) {
      const j = (((i + dir * k) % n) + n) % n;
      if (estadoZona(zonaDe(p, pid, ZONAS[j].id)) === "pend") return ZONAS[j].id;
    }
  }
  return ZONAS[(((i + dir) % n) + n) % n].id;
}

export type Paso =
  | { tipo: "persona"; pid: string }
  | { tipo: "zonas"; pid: string }
  | { tipo: "completa" };

/** Qué sigue después de terminar con una persona: la siguiente sin responder, luego zonas pendientes, y si no, completa. */
export function siguientePaso(p: Prospecto, desde: string): Paso {
  const pers = personasDe(p);
  const i = Math.max(0, pers.findIndex((x) => x.id === desde));
  for (let k = 1; k <= pers.length; k++) {
    const per = pers[(i + k) % pers.length];
    if (estadoPersona(p, per.id) === "pend") return { tipo: "persona", pid: per.id };
  }
  for (let k = 1; k <= pers.length; k++) {
    const per = pers[(i + k) % pers.length];
    if (estadoPersona(p, per.id) === "si" && zonasPendientes(p, per.id) > 0) return { tipo: "zonas", pid: per.id };
  }
  return { tipo: "completa" };
}
