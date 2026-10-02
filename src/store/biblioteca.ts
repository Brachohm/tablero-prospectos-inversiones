/**
 * Colecciones locales aparte de las fichas: la Biblioteca
 * (documentos con su texto por página, planes y argumentos) y los contactos
 * nuevos por saludar. Todo en IndexedDB, solo en este dispositivo. Los PDF se
 * guardan aparte y se leen solo al abrirlos.
 */
import { useSyncExternalStore } from "react";
import type { Argumento, Documento, Plan } from "../domain/biblioteca";
import type { ContactoNuevo } from "../domain/contactos";
import type { Ajustes } from "../domain/ajustes";
import { BaseDatos, NOMBRE_BASE } from "./almacen";

export interface DatosBiblioteca {
  docs: Documento[];
  planes: Plan[];
  argumentos: Argumento[];
  contactos: ContactoNuevo[];
  /** Configuración del asesor (un solo documento, id "ajustes"). */
  ajustes: Ajustes[];
}

type Col = keyof DatosBiblioteca;
type Item<C extends Col> = DatosBiblioteca[C][number];

export interface AlmacenBiblioteca {
  cargar(): Promise<DatosBiblioteca>;
  guardar<C extends Col>(col: C, x: Item<C>): Promise<void>;
  guardarVarios<C extends Col>(col: C, xs: Item<C>[]): Promise<void>;
  borrar(col: Col, id: string): Promise<void>;
  guardarArchivo(id: string, blob: Blob): Promise<void>;
  leerArchivo(id: string): Promise<Blob | undefined>;
  borrarArchivo(id: string): Promise<void>;
}

export function almacenBibliotecaIndexedDB(nombre = NOMBRE_BASE): AlmacenBiblioteca {
  const db = new BaseDatos(nombre);
  const tabla = (c: Col) => db.table(c);
  return {
    async cargar() {
      const [docs, planes, argumentos, contactos, ajustes] = await Promise.all([
        db.docs.toArray(),
        db.planes.toArray(),
        db.argumentos.toArray(),
        db.contactos.toArray(),
        db.ajustes.toArray(),
      ]);
      return { docs, planes, argumentos, contactos, ajustes };
    },
    guardar: async (c, x) => void (await tabla(c).put(x)),
    guardarVarios: async (c, xs) => void (await tabla(c).bulkPut(xs)),
    async borrar(c, id) {
      await db.transaction("rw", [tabla(c), db.archivos], async () => {
        await tabla(c).delete(id);
        if (c === "docs") await db.archivos.delete(id);
      });
    },
    guardarArchivo: async (id, blob) => void (await db.archivos.put({ id, blob })),
    leerArchivo: async (id) => (await db.archivos.get(id))?.blob,
    borrarArchivo: (id) => db.archivos.delete(id),
  };
}

export function almacenBibliotecaMemoria(): AlmacenBiblioteca & { archivos: Map<string, Blob> } {
  const datos: DatosBiblioteca = { docs: [], planes: [], argumentos: [], contactos: [], ajustes: [] };
  const archivos = new Map<string, Blob>();
  const poner = <C extends Col>(c: C, x: Item<C>) => {
    const lista = datos[c] as Item<C>[];
    const i = lista.findIndex((y) => y.id === x.id);
    if (i < 0) lista.push(structuredClone(x));
    else lista[i] = structuredClone(x);
  };
  return {
    archivos,
    cargar: async () => structuredClone(datos),
    guardar: async (c, x) => poner(c, x),
    guardarVarios: async (c, xs) => xs.forEach((x) => poner(c, x)),
    async borrar(c, id) {
      const lista = datos[c] as { id: string }[];
      const i = lista.findIndex((y) => y.id === id);
      if (i >= 0) lista.splice(i, 1);
      if (c === "docs") archivos.delete(id);
    },
    guardarArchivo: async (id, blob) => void archivos.set(id, blob),
    leerArchivo: async (id) => archivos.get(id),
    borrarArchivo: async (id) => void archivos.delete(id),
  };
}

export interface EstadoBiblioteca extends DatosBiblioteca {
  listo: boolean;
  error: boolean;
}

export class Biblioteca {
  private estado: EstadoBiblioteca = { docs: [], planes: [], argumentos: [], contactos: [], ajustes: [], listo: false, error: false };
  private oyentes = new Set<() => void>();
  private cola: Promise<void> = Promise.resolve();
  private canal: BroadcastChannel | null = null;
  private iniciado: Promise<void> | null = null;
  private almacen: AlmacenBiblioteca;
  private reloj: () => number;

  constructor(almacen: AlmacenBiblioteca, reloj: () => number = Date.now, canal?: string) {
    this.almacen = almacen;
    this.reloj = reloj;
    if (canal && typeof BroadcastChannel !== "undefined") {
      this.canal = new BroadcastChannel(canal);
      this.canal.onmessage = () => void this.recargar();
    }
  }

  /** Carga una sola vez (la primera pantalla que la usa). */
  iniciar(): Promise<void> {
    this.iniciado ??= this.recargar();
    return this.iniciado;
  }

  private async recargar() {
    try {
      const d = await this.almacen.cargar();
      this.estado = { ...this.estado, ...d, listo: true };
    } catch {
      this.estado = { ...this.estado, listo: true, error: true };
    }
    this.avisar();
  }

  subscribe = (fn: () => void) => {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  };

  getEstado = (): EstadoBiblioteca => this.estado;

  esperarEscrituras(): Promise<void> {
    return this.cola;
  }

  private avisar() {
    this.oyentes.forEach((fn) => fn());
  }

  private escribir(tarea: () => Promise<void>) {
    this.cola = this.cola
      .then(tarea)
      .then(() => this.canal?.postMessage("cambio"))
      .catch(() => {
        this.estado = { ...this.estado, error: true };
        this.avisar();
      });
    return this.cola;
  }

  private poner<C extends Col>(c: C, x: Item<C>) {
    const lista = this.estado[c] as Item<C>[];
    const i = lista.findIndex((y) => y.id === x.id);
    const nueva = i < 0 ? [...lista, x] : lista.map((y, j) => (j === i ? x : y));
    this.estado = { ...this.estado, [c]: nueva };
  }

  guardar<C extends Col>(c: C, x0: Item<C>) {
    const previo = (this.estado[c] as Item<C>[]).find((y) => y.id === x0.id);
    const x = { ...x0, mod: Math.max(this.reloj(), (previo?.mod ?? 0) + 1) } as Item<C>;
    this.poner(c, x);
    this.avisar();
    return this.escribir(() => this.almacen.guardar(c, x));
  }

  borrar(c: Col, id: string) {
    this.estado = { ...this.estado, [c]: (this.estado[c] as { id: string }[]).filter((y) => y.id !== id) };
    this.avisar();
    return this.escribir(() => this.almacen.borrar(c, id));
  }

  /** Agrega un documento con su archivo (si lo hay). */
  agregarDoc(d: Documento, blob?: Blob) {
    this.poner("docs", d);
    this.avisar();
    return this.escribir(async () => {
      if (blob) await this.almacen.guardarArchivo(d.id, blob);
      await this.almacen.guardar("docs", d);
    });
  }

  archivo(id: string): Promise<Blob | undefined> {
    return this.almacen.leerArchivo(id);
  }

  /** Guarda (o quita, con null) un archivo suelto, p. ej. el adjunto de un mensaje. */
  ponerArchivo(id: string, blob: Blob | null) {
    return this.escribir(() => (blob ? this.almacen.guardarArchivo(id, blob) : this.almacen.borrarArchivo(id)));
  }

  /** Importa planes, argumentos y contactos de una copia: por elemento gana el más reciente. */
  importar(d: Partial<Pick<DatosBiblioteca, "planes" | "argumentos" | "contactos" | "ajustes">>): number {
    let n = 0;
    for (const c of ["planes", "argumentos", "contactos", "ajustes"] as const) {
      const entrantes = d[c] ?? [];
      const porId = new Map((this.estado[c] as { id: string; mod: number }[]).map((x) => [x.id, x] as const));
      const escribir = entrantes.filter((x) => (porId.get(x.id)?.mod ?? -1) < (x.mod ?? 0));
      if (!escribir.length) continue;
      n += escribir.length;
      for (const x of escribir) this.poner(c, x);
      void this.escribir(() => this.almacen.guardarVarios(c, escribir as Item<typeof c>[]));
    }
    if (n) this.avisar();
    return n;
  }
}

function crear(): AlmacenBiblioteca {
  try {
    if (typeof indexedDB !== "undefined") return almacenBibliotecaIndexedDB();
  } catch {
    /* IndexedDB bloqueado */
  }
  return almacenBibliotecaMemoria();
}

export const biblioteca = new Biblioteca(crear(), Date.now, "tablero-inversiones-biblioteca");

/** Configuración del asesor (o undefined si aún no la guardó). */
export function useAjustes(b: Biblioteca = biblioteca): Ajustes | undefined {
  return useBiblioteca(b).ajustes[0];
}

export function useBiblioteca(b: Biblioteca = biblioteca): EstadoBiblioteca {
  void b.iniciar();
  return useSyncExternalStore(b.subscribe, b.getEstado);
}
