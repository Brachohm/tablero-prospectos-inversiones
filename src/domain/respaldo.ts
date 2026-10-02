/**
 * Copia de seguridad: exportar todas las fichas a un archivo JSON e
 * importarlo después (en el mismo u otro dispositivo). Al importar, por
 * cada ficha gana la versión más reciente (`mod`). La validación del archivo
 * está en `respaldo-validar.ts` (se carga solo al importar).
 */
import type { Argumento, Plan } from "./biblioteca";
import type { ContactoNuevo } from "./contactos";
import type { Ajustes } from "./ajustes";
import type { Prospecto } from "./tipos";

export const APP_RESPALDO = "tablero-prospectos-saludsa";
/** 2: agrega planes y argumentos de la Biblioteca (los PDF no viajan en la copia). 3: contactos nuevos. 4: configuración (sin los archivos adjuntos). */
export const VERSION_RESPALDO = 4;

export interface Respaldo {
  app: typeof APP_RESPALDO;
  version: number;
  /** Momento de la copia (ms). */
  fecha: number;
  fichas: Prospecto[];
  planes?: Plan[];
  argumentos?: Argumento[];
  contactos?: ContactoNuevo[];
  ajustes?: Ajustes[];
}

export function crearRespaldo(
  items: readonly Prospecto[],
  ahora: number = Date.now(),
  bib: { planes?: readonly Plan[]; argumentos?: readonly Argumento[]; contactos?: readonly ContactoNuevo[]; ajustes?: readonly Ajustes[] } = {},
): Respaldo {
  return {
    app: APP_RESPALDO,
    version: VERSION_RESPALDO,
    fecha: ahora,
    fichas: structuredClone([...items]),
    planes: structuredClone([...(bib.planes ?? [])]),
    argumentos: structuredClone([...(bib.argumentos ?? [])]),
    contactos: structuredClone([...(bib.contactos ?? [])]),
    ajustes: structuredClone([...(bib.ajustes ?? [])]),
  };
}

export interface ResultadoCombinar {
  /** Fichas a escribir (nuevas o más recientes que las locales). */
  escribir: Prospecto[];
  nuevas: number;
  actualizadas: number;
  sinCambios: number;
}

export function combinar(local: readonly Prospecto[], entrantes: readonly Prospecto[]): ResultadoCombinar {
  const porId = new Map(local.map((p) => [p.id, p] as const));
  const escribir: Prospecto[] = [];
  let nuevas = 0;
  let actualizadas = 0;
  let sinCambios = 0;
  for (const e of entrantes) {
    const l = porId.get(e.id);
    if (!l) {
      escribir.push(e);
      nuevas++;
    } else if ((e.mod || 0) > (l.mod || 0)) {
      escribir.push(e);
      actualizadas++;
    } else sinCambios++;
  }
  return { escribir, nuevas, actualizadas, sinCambios };
}
