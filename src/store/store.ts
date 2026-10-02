/**
 * Estado de la app: la lista de fichas en memoria, respaldada en IndexedDB
 * (solo en este dispositivo).
 * Cada cambio crea una ficha nueva (inmutable), pone `mod` y se escribe de
 * inmediato; las escrituras se encadenan en orden. Si hay otra pestaña
 * abierta, se avisan entre sí por BroadcastChannel.
 */
import { useSyncExternalStore } from "react";
import { combinar } from "../domain/respaldo";
import type { Prospecto } from "../domain/tipos";
import { almacenIndexedDB, almacenMemoria, type Almacen } from "./almacen";

type Oyente = () => void;

export interface EstadoStore {
  listo: boolean;
  /** Hubo un error al guardar en el dispositivo (los datos siguen en memoria). */
  errorGuardado: boolean;
}

type Mensaje = { tipo: "guardada"; id: string } | { tipo: "borrada"; id: string } | { tipo: "varias" };

export class Store {
  private items: Prospecto[] = [];
  private estado: EstadoStore = { listo: false, errorGuardado: false };
  private oyentes = new Set<Oyente>();
  private cola: Promise<void> = Promise.resolve();
  private canal: BroadcastChannel | null = null;
  private almacen: Almacen;
  private reloj: () => number;

  constructor(almacen: Almacen, reloj: () => number = Date.now, canal?: string) {
    this.almacen = almacen;
    this.reloj = reloj;
    if (canal && typeof BroadcastChannel !== "undefined") {
      this.canal = new BroadcastChannel(canal);
      this.canal.onmessage = (e: MessageEvent<Mensaje>) => void this.recibir(e.data);
    }
  }

  /** Carga las fichas del dispositivo. La interfaz espera a que termine. */
  async iniciar(): Promise<void> {
    try {
      this.items = await this.almacen.cargar();
    } catch {
      this.estado = { ...this.estado, errorGuardado: true };
    }
    this.estado = { ...this.estado, listo: true };
    this.avisar();
  }

  subscribe = (fn: Oyente) => {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  };

  getItems = (): readonly Prospecto[] => this.items;
  getEstado = (): EstadoStore => this.estado;

  get(id: string): Prospecto | undefined {
    return this.items.find((p) => p.id === id);
  }

  /** Espera a que terminen las escrituras pendientes (para pruebas y antes de exportar). */
  esperarEscrituras(): Promise<void> {
    return this.cola;
  }

  private avisar() {
    this.oyentes.forEach((fn) => fn());
  }

  private escribir(tarea: () => Promise<void>, msg: Mensaje) {
    this.cola = this.cola
      .then(tarea)
      .then(() => {
        this.canal?.postMessage(msg);
        if (this.estado.errorGuardado) {
          this.estado = { ...this.estado, errorGuardado: false };
          this.avisar();
        }
      })
      .catch(() => {
        this.estado = { ...this.estado, errorGuardado: true };
        this.avisar();
      });
  }

  private reemplazar(p: Prospecto) {
    const i = this.items.findIndex((x) => x.id === p.id);
    this.items = i < 0 ? [...this.items, p] : this.items.map((x, j) => (j === i ? p : x));
  }

  /** Agrega una ficha nueva (ya con consentimiento). */
  agregar(p0: Prospecto) {
    const p = { ...p0, mod: this.ahora() };
    this.reemplazar(p);
    this.avisar();
    this.escribir(() => this.almacen.guardar(p), { tipo: "guardada", id: p.id });
  }

  /** Aplica un cambio a una ficha. Si el cambio devuelve la misma ficha, no hace nada. */
  actualizar(id: string, fn: (p: Prospecto) => Prospecto) {
    const antes = this.get(id);
    if (!antes) return;
    const despues = fn(antes);
    if (despues === antes) return;
    const p = { ...despues, id: antes.id, mod: this.ahora(antes.mod) };
    this.reemplazar(p);
    this.avisar();
    this.escribir(() => this.almacen.guardar(p), { tipo: "guardada", id });
  }

  borrar(id: string) {
    this.items = this.items.filter((p) => p.id !== id);
    this.avisar();
    this.escribir(() => this.almacen.borrar(id), { tipo: "borrada", id });
  }

  /** Importa fichas (copia de seguridad): por ficha gana la más reciente. */
  importar(fichas: readonly Prospecto[]) {
    const r = combinar(this.items, fichas);
    if (r.escribir.length) {
      r.escribir.forEach((p) => this.reemplazar(p));
      this.avisar();
      this.escribir(() => this.almacen.guardarVarias(r.escribir), { tipo: "varias" });
    }
    return r;
  }

  /** Otra pestaña cambió algo: se relee del dispositivo y gana la más reciente. */
  private async recibir(m: Mensaje) {
    if (m.tipo === "borrada") {
      if (this.get(m.id)) {
        this.items = this.items.filter((p) => p.id !== m.id);
        this.avisar();
      }
      return;
    }
    if (m.tipo === "varias") {
      const r = combinar(this.items, await this.almacen.cargar());
      if (r.escribir.length) {
        r.escribir.forEach((p) => this.reemplazar(p));
        this.avisar();
      }
      return;
    }
    const remota = await this.almacen.leer(m.id);
    const local = this.get(m.id);
    if (remota && (!local || (remota.mod || 0) > (local.mod || 0))) {
      this.reemplazar(remota);
      this.avisar();
    }
  }

  /** `mod` siempre crece, aunque el reloj del dispositivo retroceda. */
  private ahora(previo = 0): number {
    return Math.max(this.reloj(), previo + 1);
  }
}

function crearAlmacen(): Almacen {
  try {
    if (typeof indexedDB !== "undefined") return almacenIndexedDB();
  } catch {
    /* IndexedDB bloqueado */
  }
  return almacenMemoria();
}

export const store = new Store(crearAlmacen(), Date.now, "tablero-inversiones-fichas");

export function useFichas(s: Store = store): readonly Prospecto[] {
  return useSyncExternalStore(s.subscribe, s.getItems);
}

export function useEstadoStore(s: Store = store): EstadoStore {
  return useSyncExternalStore(s.subscribe, s.getEstado);
}

export function useFicha(id: string | undefined, s: Store = store): Prospecto | undefined {
  const items = useFichas(s);
  return id ? items.find((p) => p.id === id) : undefined;
}
