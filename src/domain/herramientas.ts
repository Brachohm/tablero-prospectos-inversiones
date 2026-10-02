/**
 * Herramientas de envío: WhatsApp (app del celular o WhatsApp Web) y el
 * correo del asesor según su dominio (Gmail, Outlook, Yahoo… o la app de
 * correo del equipo). Solo arma enlaces: la app no se conecta a ninguna
 * cuenta, y el asesor toca "Enviar" en cada herramienta.
 */
import { whatsAppDe } from "./ficha";
import { sinEmojis } from "./texto";

export type ModoWhatsApp = "auto" | "web" | "app";
export type ProveedorCorreo = "gmail" | "outlook" | "office" | "yahoo" | "app";

export interface Herramientas {
  modoWhatsApp: ModoWhatsApp;
  /** "auto" = según el dominio del correo. */
  proveedor: "auto" | ProveedorCorreo;
  /** Día en que se sincronizó cada herramienta. */
  whatsappListo?: string;
  correoListo?: string;
  /** Modo sin conexión: se usan las apps del celular (WhatsApp y correo), que no necesitan una página web abierta. */
  sinConexion?: boolean;
}

export const HERRAMIENTAS_INICIALES: Herramientas = { modoWhatsApp: "auto", proveedor: "auto" };

export const PROVEEDORES: readonly { id: ProveedorCorreo; l: string }[] = [
  { id: "gmail", l: "Gmail / Google Workspace" },
  { id: "outlook", l: "Outlook.com / Hotmail" },
  { id: "office", l: "Outlook de Microsoft 365 (empresa)" },
  { id: "yahoo", l: "Yahoo" },
  { id: "app", l: "App de correo del equipo" },
];

export function proveedorPorDominio(correo: string): ProveedorCorreo {
  const d = correo.trim().toLowerCase().split("@")[1] ?? "";
  if (/^(gmail|googlemail)\.com$/.test(d)) return "gmail";
  if (/^(outlook|hotmail|live|msn)\.[a-z.]+$/.test(d)) return "outlook";
  if (/^(yahoo|ymail)\.[a-z.]+$/.test(d)) return "yahoo";
  return "app";
}

export function proveedorDe(h: Herramientas | undefined, correo: string): ProveedorCorreo {
  return h && h.proveedor !== "auto" ? h.proveedor : proveedorPorDominio(correo);
}

export function nombreProveedor(p: ProveedorCorreo): string {
  return PROVEEDORES.find((x) => x.id === p)?.l ?? p;
}

export interface Enlace {
  href: string;
  /** Pestaña con nombre: se reutiliza en vez de abrir una nueva cada vez. */
  target?: string;
}

const q = encodeURIComponent;

/** Redactar un correo con la herramienta del asesor. */
export function enlaceCorreo(
  proveedor: ProveedorCorreo,
  cuenta: string,
  para: string,
  asunto0: string,
  cuerpo0: string,
): Enlace {
  // Sin emojis: los correos los muestran como signos raros.
  const asunto = sinEmojis(asunto0);
  const cuerpo = sinEmojis(cuerpo0);
  switch (proveedor) {
    case "gmail":
      return {
        href:
          `https://mail.google.com/mail/?view=cm&fs=1${cuenta ? "&authuser=" + q(cuenta) : ""}` +
          `&to=${q(para)}&su=${q(asunto)}&body=${q(cuerpo)}`,
        target: "correo",
      };
    case "outlook":
      return {
        href: `https://outlook.live.com/mail/0/deeplink/compose?to=${q(para)}&subject=${q(asunto)}&body=${q(cuerpo)}`,
        target: "correo",
      };
    case "office":
      return {
        href: `https://outlook.office.com/mail/deeplink/compose?to=${q(para)}&subject=${q(asunto)}&body=${q(cuerpo)}`,
        target: "correo",
      };
    case "yahoo":
      return {
        href: `https://compose.mail.yahoo.com/?to=${q(para)}&subject=${q(asunto)}&body=${q(cuerpo)}`,
        target: "correo",
      };
    default:
      return { href: `mailto:${q(para)}?subject=${q(asunto)}&body=${q(cuerpo)}` };
  }
}

/** Bandeja de entrada (para dejar la sesión abierta al sincronizar). */
export function bandejaCorreo(proveedor: ProveedorCorreo, cuenta: string): Enlace {
  switch (proveedor) {
    case "gmail":
      return { href: `https://mail.google.com/mail/${cuenta ? "?authuser=" + q(cuenta) : ""}`, target: "correo" };
    case "outlook":
      return { href: "https://outlook.live.com/mail/", target: "correo" };
    case "office":
      return { href: "https://outlook.office.com/mail/", target: "correo" };
    case "yahoo":
      return { href: "https://mail.yahoo.com/", target: "correo" };
    default:
      return { href: `mailto:${q(cuenta)}?subject=${q("Prueba de conexión")}` };
  }
}

/** ¿Se usa WhatsApp Web? (en "auto": sí en computadora, no en celular; nunca sin conexión ni en el celular). */
export function usaWeb(modo: ModoWhatsApp, esCelular: boolean, sinConexion = false): boolean {
  if (sinConexion || esCelular) return false;
  return modo === "web" || modo === "auto";
}

/**
 * Correo con el que se redacta. En el celular (o sin conexión) se usa la app
 * de correo del teléfono: abre Gmail, Outlook… con destinatario, asunto y
 * texto listos; solo falta tocar "Enviar".
 */
export function proveedorEfectivo(h: Herramientas | undefined, correo: string, esCelular: boolean): ProveedorCorreo {
  if (esCelular || h?.sinConexion) return "app";
  return proveedorDe(h, correo);
}

/** Chat de WhatsApp con un número (ya en formato internacional) y texto opcional. */
export function enlaceWhatsApp(numero: string, texto0: string, web: boolean): Enlace {
  // Sin emojis: muchos teléfonos los muestran como signos raros al abrir el enlace.
  const texto = sinEmojis(texto0);
  if (web)
    return {
      href: `https://web.whatsapp.com/send?phone=${numero}${texto ? "&text=" + q(texto) : ""}`,
      target: "whatsapp",
    };
  return { href: `https://wa.me/${numero}${texto ? "?text=" + q(texto) : ""}`, target: "_blank" };
}

export function bandejaWhatsApp(web: boolean, propio: string): Enlace {
  if (web) return { href: "https://web.whatsapp.com/", target: "whatsapp" };
  const n = whatsAppDe(propio);
  return {
    href: n ? `https://wa.me/${n}?text=${q("Prueba de conexión del Tablero de prospectos")}` : "https://wa.me/",
    target: "_blank",
  };
}

/** Firma para correos e informes. */
export function firma(p: { nombreCompleto: string; apodo: string; rol: string; celular?: string; correo?: string }): string {
  return [
    p.nombreCompleto.trim() || p.apodo,
    p.rol,
    p.celular?.trim() ? `WhatsApp: ${p.celular.trim()}` : "",
    p.correo?.trim() ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}
