/**
 * Rutas por hash, para que el botón "atrás" del celular funcione:
 *   #/            inicio: dashboard (prospectos)
 *   #/clientes    inicio (clientes)
 *   #/gestion[/contactos]  Centro de Gestión (uno a uno, o la lista de contactos)
 *   #/base        Base de datos (cargar Excel y filtrar)
 *   #/ficha/:id   ficha existente
 *   #/nueva/:tipo[?ref=:id][&contacto=:id]  ficha nueva (borrador hasta el consentimiento)
 *   #/biblioteca[/planes|/argumentos]  Biblioteca (se entra desde Configuración)
 *   #/ajustes[/seguimiento|/saludo|/invitacion|/biblioteca|/datos]  Configuración
 */
import { useSyncExternalStore } from "react";
import type { Tipo } from "../domain/tipos";

export type Ruta =
  | { v: "tablero"; tab: TabTablero }
  | { v: "ficha"; id: string }
  | { v: "nueva"; tipo: Tipo; ref?: string; contacto?: string }
  | { v: "biblioteca"; sec: SeccionBiblioteca }
  | { v: "ajustes"; sec: SeccionAjustes }
  | { v: "gestion"; modo: ModoGestion }
  | { v: "base" };

export type SeccionAjustes = "perfil" | "seguimiento" | "saludo" | "invitacion" | "referidos" | "biblioteca" | "datos";

export type TabTablero = "prospectos" | "clientes";

export type ModoGestion = "uno" | "contactos";

export type SeccionBiblioteca = "docs" | "planes" | "argumentos";

export function leerRuta(hash: string): Ruta {
  const [path, query = ""] = hash.replace(/^#/, "").split("?");
  const partes = path.split("/").filter(Boolean);
  if (partes[0] === "ficha" && partes[1]) return { v: "ficha", id: decodeURIComponent(partes[1]) };
  if (partes[0] === "nueva" && (partes[1] === "nuevo" || partes[1] === "cambio")) {
    const q = new URLSearchParams(query);
    const ref = q.get("ref") ?? undefined;
    const contacto = q.get("contacto") ?? undefined;
    return { v: "nueva", tipo: partes[1], ...(ref ? { ref } : {}), ...(contacto ? { contacto } : {}) };
  }
  if (partes[0] === "ajustes")
    return {
      v: "ajustes",
      sec: (["seguimiento", "saludo", "invitacion", "referidos", "biblioteca", "datos"] as const).find((x) => x === partes[1]) ?? "perfil",
    };
  if (partes[0] === "biblioteca")
    return { v: "biblioteca", sec: partes[1] === "planes" || partes[1] === "argumentos" ? partes[1] : "docs" };
  if (partes[0] === "clientes") return { v: "tablero", tab: "clientes" };
  if (partes[0] === "gestion") return { v: "gestion", modo: partes[1] === "contactos" ? "contactos" : "uno" };
  // Enlace viejo: la lista de contactos ahora vive en el Centro de Gestión.
  if (partes[0] === "contactos") return { v: "gestion", modo: "contactos" };
  if (partes[0] === "base") return { v: "base" };
  return { v: "tablero", tab: "prospectos" };
}

export function hashDe(r: Ruta): string {
  if (r.v === "ficha") return "#/ficha/" + encodeURIComponent(r.id);
  if (r.v === "nueva") {
    const q = new URLSearchParams();
    if (r.ref) q.set("ref", r.ref);
    if (r.contacto) q.set("contacto", r.contacto);
    const qs = q.toString();
    return "#/nueva/" + r.tipo + (qs ? "?" + qs : "");
  }
  if (r.v === "gestion") return "#/gestion" + (r.modo === "contactos" ? "/contactos" : "");
  if (r.v === "base") return "#/base";
  if (r.v === "ajustes") return "#/ajustes" + (r.sec === "perfil" ? "" : "/" + r.sec);
  if (r.v === "biblioteca") return "#/biblioteca" + (r.sec === "docs" ? "" : "/" + r.sec);
  return r.tab === "prospectos" ? "#/" : "#/" + r.tab;
}

/** Profundidad de navegación dentro de la app, guardada en cada entrada del historial. */
function profundidad(): number {
  const d = (history.state as { d?: number } | null)?.d;
  return typeof d === "number" ? d : 0;
}

export function ir(r: Ruta, { reemplazar = false } = {}) {
  const h = hashDe(r);
  if (reemplazar) history.replaceState({ d: profundidad() }, "", h);
  else history.pushState({ d: profundidad() + 1 }, "", h);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/** Vuelve atrás si se llegó navegando dentro de la app; si no (enlace directo), al tablero sin salir de la app. */
export function volver(fallback: Ruta = { v: "tablero", tab: "prospectos" }) {
  if (profundidad() > 0) history.back();
  else ir(fallback, { reemplazar: true });
}

function sub(fn: () => void) {
  window.addEventListener("hashchange", fn);
  window.addEventListener("popstate", fn);
  return () => {
    window.removeEventListener("hashchange", fn);
    window.removeEventListener("popstate", fn);
  };
}

export function useHash(): string {
  return useSyncExternalStore(sub, () => location.hash);
}
