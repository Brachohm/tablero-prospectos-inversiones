/** Hooks compartidos de la interfaz. */
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { CONTACTOS_MAX } from "../config/ficha";
import { borrarContacto, registrarContactoRapido } from "../domain/crm";
import { hoyISO } from "../domain/fechas";
import { historialDe } from "../domain/ficha";
import type { Canal, Contacto } from "../domain/tipos";
import { store, useFichas as useFichasHook } from "../store/store";
import { herramientasDe, perfilDe } from "../domain/ajustes";
import { enlaceCorreo, enlaceWhatsApp, proveedorEfectivo, usaWeb } from "../domain/herramientas";
import { useAjustes, useBiblioteca } from "../store/biblioteca";
import { argumentosDelSistema, type ArgumentoAuto } from "../domain/aprender";
import type { Argumento } from "../domain/biblioteca";

/** Acción opcional del aviso (p. ej. "Deshacer"). */
export interface AccionAviso {
  texto: string;
  alTocar: () => void;
}

export const AvisoCtx = createContext<(msg: string, accion?: AccionAviso) => void>(() => {});

/** Muestra un aviso breve ("+10 XP"), con una acción opcional. */
export function useAviso() {
  return useContext(AvisoCtx);
}

/**
 * Confirmación en dos toques (sin diálogos nativos: lección 1 del prototipo).
 * El primer toque "arma" el botón por 4 segundos; el segundo ejecuta.
 */
export function useArmado(accion: () => void, ms = 4000): [boolean, () => void] {
  const [armado, setArmado] = useState(false);
  const t = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(t.current), []);
  const click = useCallback(() => {
    if (armado) {
      window.clearTimeout(t.current);
      setArmado(false);
      accion();
      return;
    }
    setArmado(true);
    t.current = window.setTimeout(() => setArmado(false), ms);
  }, [armado, accion, ms]);
  return [armado, click];
}

/** Registra un contacto en el historial de la ficha, con aviso y "Deshacer". */
export function useRegistrar(id: string) {
  const avisar = useAviso();
  return (canal: Canal, nota: string, texto: string) => {
    let nuevo: Contacto | null = null;
    let antes = 0;
    store.actualizar(id, (x) => {
      antes = historialDe(x).length;
      const r = registrarContactoRapido(x, canal, hoyISO(), Date.now(), nota);
      nuevo = r.nuevo;
      return r.ficha;
    });
    const n = nuevo as Contacto | null;
    if (!n) return;
    avisar(`En el historial: ${texto}${antes < CONTACTOS_MAX ? " · +10 XP" : ""}`, {
      texto: "Deshacer",
      alTocar: () => store.actualizar(id, (x) => borrarContacto(x, n.id)),
    });
  };
}


/** Configuración guardada y el perfil del asesor (con sus valores por defecto). */
export function useAjustesPerfil() {
  const ajustes = useAjustes();
  return { ajustes, perfil: perfilDe(ajustes) };
}

/** ¿Se usa desde un celular? (para elegir entre la app de WhatsApp y WhatsApp Web). */
export function esCelular(): boolean {
  try {
    return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  } catch {
    return false;
  }
}

/** Enlaces de envío con las herramientas sincronizadas (WhatsApp y correo del asesor). */
export function useEnlaces() {
  const { ajustes, perfil } = useAjustesPerfil();
  const h = herramientasDe(ajustes);
  const celular = esCelular();
  const web = usaWeb(h.modoWhatsApp, celular, h.sinConexion);
  const proveedor = proveedorEfectivo(h, perfil.correo ?? "", celular);
  return {
    web,
    sinConexion: !!h.sinConexion,
    proveedor,
    wa: (numero: string, texto = "") => enlaceWhatsApp(numero, texto, web),
    correo: (para: string, asunto: string, cuerpo: string) =>
      enlaceCorreo(proveedor, perfil.correo ?? "", para, asunto, cuerpo),
  };
}

/** Hay conexión a internet (WiFi o datos), según el navegador. */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setEnLinea(true);
    const off = () => setEnLinea(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return enLinea;
}

/** Tus argumentos y los que crea el sistema con tu Biblioteca y tus comparaciones (sin los ocultos). */
export function useArgumentos(): { propios: Argumento[]; sistema: ArgumentoAuto[]; todos: Argumento[] } {
  const { argumentos, planes, docs, ajustes } = useBiblioteca();
  const fichas = useFichasHook();
  const ocultos = new Set(ajustes[0]?.argumentosOcultos ?? []);
  const sistema = argumentosDelSistema(planes, docs, fichas).filter((a) => !ocultos.has(a.id));
  return { propios: argumentos, sistema, todos: [...argumentos, ...sistema] };
}

/** Hora actual (ms) que se actualiza sola cada `cada` ms (por defecto, cada 30 segundos). */
export function useAhora(cada = 30000): number {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), cada);
    return () => clearInterval(t);
  }, [cada]);
  return ahora;
}
