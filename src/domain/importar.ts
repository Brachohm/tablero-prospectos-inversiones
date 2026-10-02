/**
 * Base de datos: leer filas de un Excel o CSV, reconocer las columnas
 * (nombre, edad, ciudad, contacto, correo), filtrar y evitar duplicados.
 * La lectura del .xlsx está en ui/excel.ts; aquí solo hay lógica pura.
 */
import { normalizar } from "./biblioteca";
import { crearContacto, type ContactoNuevo } from "./contactos";
import { txt } from "./ficha";
import type { Prospecto } from "./tipos";

export type CampoImport = "nombre" | "edad" | "ciudad" | "contacto" | "correo";

export const CAMPOS_IMPORT: readonly { k: CampoImport; l: string; sinonimos: string[] }[] = [
  { k: "nombre", l: "Nombre", sinonimos: ["nombre", "nombres", "nombre completo", "cliente", "apellidos y nombres", "name"] },
  { k: "edad", l: "Edad", sinonimos: ["edad", "anos", "age", "nacimiento", "fecha de nacimiento", "fecha nac", "f nac"] },
  { k: "ciudad", l: "Ciudad", sinonimos: ["ciudad", "canton", "localidad", "provincia", "city"] },
  {
    k: "contacto",
    l: "Contacto",
    sinonimos: ["contacto", "celular", "telefono", "whatsapp", "movil", "cel", "numero", "phone", "telf"],
  },
  { k: "correo", l: "Correo", sinonimos: ["correo", "email", "e-mail", "mail", "correo electronico"] },
];

export type Celda = string | number | boolean | Date | null | undefined;
export type Mapeo = Partial<Record<CampoImport, number>>;

export interface Registro {
  nombre: string;
  edad: string;
  ciudad: string;
  contacto: string;
  correo: string;
}

function texto(c: Celda): string {
  if (c === null || c === undefined) return "";
  if (c instanceof Date) return c.toISOString().slice(0, 10);
  return String(c).trim();
}

/** Busca la fila de encabezados (de las primeras 10) y a qué columna corresponde cada campo. */
export function detectarColumnas(filas: Celda[][]): { fila: number; mapeo: Mapeo } {
  let mejor = { fila: 0, mapeo: {} as Mapeo, n: 0 };
  filas.slice(0, 10).forEach((fila, i) => {
    const mapeo: Mapeo = {};
    fila.forEach((c, j) => {
      const h = normalizar(texto(c)).replace(/[^a-z0-9 -]/g, "").trim();
      if (!h) return;
      for (const campo of CAMPOS_IMPORT) {
        if (mapeo[campo.k] !== undefined) continue;
        if (campo.sinonimos.some((s) => h === s || h.startsWith(s + " ") || h.endsWith(" " + s))) {
          mapeo[campo.k] = j;
          break;
        }
      }
    });
    const n = Object.keys(mapeo).length;
    if (n > mejor.n) mejor = { fila: i, mapeo, n };
  });
  return { fila: mejor.fila, mapeo: mejor.mapeo };
}

/** Edad a partir de un número o de una fecha de nacimiento. */
export function edadDe(c: Celda, hoy: string): string {
  if (typeof c === "number") return c > 0 && c < 121 ? String(Math.floor(c)) : "";
  const s = texto(c);
  if (/^\d{1,3}$/.test(s)) return Number(s) <= 120 ? s : "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s) ?? null;
  const dmy = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(s);
  const [a, mes, d] = m ? [+m[1], +m[2], +m[3]] : dmy ? [+dmy[3], +dmy[2], +dmy[1]] : [0, 0, 0];
  if (!a) return "";
  const [ha, hm, hd] = hoy.split("-").map(Number);
  const e = ha - a - (hm < mes || (hm === mes && hd < d) ? 1 : 0);
  return e >= 0 && e <= 120 ? String(e) : "";
}

export function registros(filas: Celda[][], fila: number, mapeo: Mapeo, hoy: string): Registro[] {
  const col = (r: Celda[], k: CampoImport) => (mapeo[k] === undefined ? undefined : r[mapeo[k]!]);
  return filas
    .slice(fila + 1)
    .map((r) => ({
      nombre: texto(col(r, "nombre")).replace(/\s+/g, " "),
      edad: edadDe(col(r, "edad"), hoy),
      ciudad: texto(col(r, "ciudad")),
      contacto: texto(col(r, "contacto")),
      correo: texto(col(r, "correo")).toLowerCase(),
    }))
    .filter((x) => x.nombre && (x.contacto || x.correo));
}

/** CSV con coma o punto y coma, comillas dobles y saltos de línea dentro de comillas. */
export function leerCSV(s: string): string[][] {
  const t = s.replace(/^﻿/, "");
  const primera = t.split(/\r?\n/)[0] ?? "";
  const sep = (primera.match(/;/g)?.length ?? 0) > (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const out: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (comillas) {
      if (ch === '"' && t[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (ch === '"') comillas = false;
      else celda += ch;
    } else if (ch === '"') comillas = true;
    else if (ch === sep) {
      fila.push(celda);
      celda = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      out.push(fila);
      fila = [];
      celda = "";
    } else celda += ch;
  }
  if (celda || fila.length) {
    fila.push(celda);
    out.push(fila);
  }
  return out.filter((f) => f.some((c) => c.trim()));
}

export interface FiltroBase {
  texto: string;
  ciudad: string;
  edadMin: string;
  edadMax: string;
  conContacto: boolean;
  conCorreo: boolean;
}

export const FILTRO_VACIO: FiltroBase = { texto: "", ciudad: "", edadMin: "", edadMax: "", conContacto: false, conCorreo: false };

export function filtrarRegistros<T extends Registro>(rs: readonly T[], f: FiltroBase): T[] {
  const q = normalizar(f.texto.trim());
  const ciudad = normalizar(f.ciudad.trim());
  const min = f.edadMin.trim() ? Number(f.edadMin) : null;
  const max = f.edadMax.trim() ? Number(f.edadMax) : null;
  return rs.filter((r) => {
    if (q && !normalizar(`${r.nombre} ${r.contacto} ${r.correo} ${r.ciudad}`).includes(q)) return false;
    if (ciudad && normalizar(r.ciudad) !== ciudad) return false;
    if (min !== null || max !== null) {
      if (!r.edad) return false;
      const e = Number(r.edad);
      if (min !== null && e < min) return false;
      if (max !== null && e > max) return false;
    }
    if (f.conContacto && !r.contacto) return false;
    if (f.conCorreo && !r.correo) return false;
    return true;
  });
}

export function ciudades(rs: readonly Registro[]): string[] {
  const m = new Map<string, string>();
  for (const r of rs) if (r.ciudad && !m.has(normalizar(r.ciudad))) m.set(normalizar(r.ciudad), r.ciudad);
  return [...m.values()].sort((a, b) => a.localeCompare(b));
}

/** Clave para detectar duplicados: últimos 9 dígitos del teléfono, o el correo. */
export function claves(contacto: string, correo: string): string[] {
  const d = contacto.replace(/\D/g, "");
  return [...(d.length >= 7 ? ["t" + d.slice(-9)] : []), ...(correo.trim() ? ["c" + correo.trim().toLowerCase()] : [])];
}

export function clavesExistentes(contactos: readonly ContactoNuevo[], fichas: readonly Prospecto[]): Set<string> {
  const s = new Set<string>();
  for (const c of contactos) claves(c.celular, c.correo).forEach((k) => s.add(k));
  for (const p of fichas) claves(txt(p, "whatsapp"), txt(p, "correo")).forEach((k) => s.add(k));
  return s;
}

export function esDuplicado(r: Registro, existentes: Set<string>): boolean {
  return claves(r.contacto, r.correo).some((k) => existentes.has(k));
}

/** Contactos nuevos (origen "Base de datos") desde los registros, sin repetir número o correo. */
export function contactosDesde(rs: readonly Registro[], ahora: number = Date.now()): ContactoNuevo[] {
  const vistos = new Set<string>();
  const out: ContactoNuevo[] = [];
  rs.forEach((r, i) => {
    const ks = claves(r.contacto, r.correo);
    if (ks.some((k) => vistos.has(k))) return;
    ks.forEach((k) => vistos.add(k));
    out.push(
      crearContacto(
        { nombre: r.nombre, edad: r.edad, ciudad: r.ciudad, celular: r.contacto, correo: r.correo, origen: "Base de datos" },
        ahora + i,
      ),
    );
  });
  return out;
}
