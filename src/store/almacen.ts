/**
 * Dónde se guardan las fichas: IndexedDB (con Dexie), solo en este
 * dispositivo. Cada cambio escribe solo esa ficha, de inmediato.
 */
import Dexie, { type Table } from "dexie";
import type { Argumento, Documento, Plan } from "../domain/biblioteca";
import type { ContactoNuevo } from "../domain/contactos";
import type { Ajustes } from "../domain/ajustes";
import type { Prospecto } from "../domain/tipos";

export interface Almacen {
  cargar(): Promise<Prospecto[]>;
  leer(id: string): Promise<Prospecto | undefined>;
  guardar(p: Prospecto): Promise<void>;
  guardarVarias(ps: readonly Prospecto[]): Promise<void>;
  borrar(id: string): Promise<void>;
}

export interface Archivo {
  id: string;
  blob: Blob;
}

export class BaseDatos extends Dexie {
  fichas!: Table<Prospecto, string>;
  docs!: Table<Documento, string>;
  archivos!: Table<Archivo, string>;
  planes!: Table<Plan, string>;
  argumentos!: Table<Argumento, string>;
  contactos!: Table<ContactoNuevo, string>;
  ajustes!: Table<Ajustes, string>;
  constructor(nombre: string) {
    super(nombre);
    this.version(1).stores({ fichas: "id, mod", lapidas: "id" });
    this.version(2).stores({ fichas: "id, mod", lapidas: "id", pendientes: "id", meta: "k" });
    // Versión 3: solo local, sin tablas de sincronización.
    this.version(3).stores({ fichas: "id, mod", lapidas: null, pendientes: null, meta: null });
    // Versión 4: Biblioteca (documentos, archivos PDF, planes y argumentos).
    this.version(4).stores({ docs: "id", archivos: "id", planes: "id", argumentos: "id" });
    // Versión 5: contactos nuevos por saludar.
    this.version(5).stores({ contactos: "id" });
    // Versión 6: configuración del asesor (perfil y mensajes).
    this.version(6).stores({ ajustes: "id" });
  }
}

/** Clave que usó la Fase 2 (localStorage). Se migra una sola vez. */
export const CLAVE_LOCALSTORAGE = "tablero-saludsa:fichas:v1";

function leerLocalStorage(): Prospecto[] {
  try {
    const raw = localStorage.getItem(CLAVE_LOCALSTORAGE);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data)
      ? data.filter((x): x is Prospecto => !!x && typeof x === "object" && typeof (x as Prospecto).id === "string")
      : [];
  } catch {
    return [];
  }
}

export const NOMBRE_BASE = "tablero-prospectos-saludsa";

export function almacenIndexedDB(nombre = NOMBRE_BASE): Almacen {
  const db = new BaseDatos(nombre);
  return {
    async cargar() {
      const fichas = await db.fichas.toArray();
      const viejas = leerLocalStorage();
      if (viejas.length) {
        // Migración desde la Fase 2: solo agrega lo que no esté o sea más nuevo.
        const porId = new Map(fichas.map((p) => [p.id, p] as const));
        await db.fichas.bulkPut(viejas.filter((v) => (porId.get(v.id)?.mod ?? -1) < (v.mod ?? 0)));
        try {
          localStorage.removeItem(CLAVE_LOCALSTORAGE);
        } catch {
          /* sin acceso a localStorage */
        }
        return db.fichas.toArray();
      }
      return fichas;
    },
    leer: (id) => db.fichas.get(id),
    guardar: async (p) => void (await db.fichas.put(p)),
    guardarVarias: async (ps) => void (await db.fichas.bulkPut([...ps])),
    borrar: (id) => db.fichas.delete(id),
  };
}

/** En memoria: para pruebas, o si el navegador no permite IndexedDB. */
export function almacenMemoria(inicial: Prospecto[] = []): Almacen & { datos: Map<string, Prospecto> } {
  const datos = new Map(inicial.map((p) => [p.id, structuredClone(p)] as const));
  return {
    datos,
    cargar: async () => [...datos.values()].map((p) => structuredClone(p)),
    leer: async (id) => (datos.has(id) ? structuredClone(datos.get(id)) : undefined),
    guardar: async (p) => void datos.set(p.id, structuredClone(p)),
    guardarVarias: async (ps) => ps.forEach((p) => datos.set(p.id, structuredClone(p))),
    borrar: async (id) => void datos.delete(id),
  };
}

/** Pide al navegador que no borre los datos de la app cuando le falte espacio. */
export async function pedirPersistencia(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
