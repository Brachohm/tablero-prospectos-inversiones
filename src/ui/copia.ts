/**
 * Copia de seguridad: crear (descargar o enviar por el menú de compartir) y
 * restaurar. La usan "Tus datos" (Configuración → Datos), el fin de gestión y
 * el inicio de jornada.
 */
import { crearRespaldo } from "../domain/respaldo";
import { biblioteca } from "../store/biblioteca";
import { store } from "../store/store";
import { hoyISO } from "../domain/fechas";

const CLAVE_ULTIMA = "tablero-inversiones:ultima-copia";

export function leerUltimaCopia(): number | null {
  try {
    const v = Number(localStorage.getItem(CLAVE_ULTIMA));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

export function recordarUltimaCopia(): number {
  const ahora = Date.now();
  try {
    localStorage.setItem(CLAVE_ULTIMA, String(ahora));
  } catch {
    /* sin localStorage: solo no se recuerda la fecha */
  }
  return ahora;
}

export function descargarTexto(nombre: string, contenido: string, tipo: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** El navegador puede compartir archivos (menú de compartir del celular). */
export function puedeCompartirArchivos(): boolean {
  try {
    const prueba = new File(["{}"], "x.json", { type: "application/json" });
    return typeof navigator.share === "function" && !!navigator.canShare?.({ files: [prueba] });
  } catch {
    return false;
  }
}

export function nombreCopia(hoy = hoyISO()): string {
  return `respaldo-prospectos-${hoy}.json`;
}

export async function contenidoCopia(): Promise<string> {
  await biblioteca.iniciar();
  await Promise.all([store.esperarEscrituras(), biblioteca.esperarEscrituras()]);
  const { planes, argumentos, contactos, ajustes } = biblioteca.getEstado();
  return JSON.stringify(crearRespaldo(store.getItems(), Date.now(), { planes, argumentos, contactos, ajustes }));
}

export async function descargarCopia(): Promise<void> {
  descargarTexto(nombreCopia(), await contenidoCopia(), "application/json");
  recordarUltimaCopia();
}

/** Envía la copia por el menú de compartir (Drive, WhatsApp, correo…). */
export async function compartirCopia(): Promise<"ok" | "cancelado" | "error"> {
  const file = new File([await contenidoCopia()], nombreCopia(), { type: "application/json" });
  try {
    await navigator.share({ files: [file], title: "Copia de mis prospectos" });
    recordarUltimaCopia();
    return "ok";
  } catch (e) {
    return (e as DOMException)?.name === "AbortError" ? "cancelado" : "error";
  }
}

/** Restaura una copia: por elemento gana lo más reciente. Devuelve el mensaje para el aviso. */
export async function importarCopia(f: File): Promise<{ ok: boolean; msg: string }> {
  const { leerRespaldo } = await import("../domain/respaldo-validar");
  const r = leerRespaldo(await f.text());
  if (!r.ok) return { ok: false, msg: r.error };
  const c = store.importar(r.fichas);
  await biblioteca.iniciar();
  const b = biblioteca.importar({ planes: r.planes, argumentos: r.argumentos, contactos: r.contactos, ajustes: r.ajustes });
  return {
    ok: true,
    msg:
      `Importado: ${c.nuevas} nuevas, ${c.actualizadas} actualizadas` +
      (c.sinCambios ? `, ${c.sinCambios} ya estaban al día` : "") +
      (b ? ` · biblioteca y contactos: ${b} al día` : "") +
      (r.descartadas ? ` (${r.descartadas} dañadas)` : ""),
  };
}
