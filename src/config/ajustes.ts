/**
 * Textos iniciales de la Configuración (el asesor los cambia en la app).
 * Variables: {nombre} primer nombre del prospecto o contacto · {asesor} cómo
 * te gusta que te llamen · {rol} tu rol · {fecha} {hora} {lugar} de la reunión.
 */
import type { ClaveMensaje } from "../domain/ajustes";
import { CADENA_REFERIDO } from "./referidos";

export const PERFIL_INICIAL = { nombreCompleto: "", apodo: "Bracho", rol: "asesor de SaludSA" };

/** Tamaño máximo de un adjunto (30 MB). */
export const MAX_ADJUNTO = 30 * 1024 * 1024;

export const MENSAJES_CONFIG: readonly {
  clave: ClaveMensaje;
  grupo: "seguimiento" | "saludo" | "invitacion" | "referidos";
  l: string;
  ayuda: string;
  /** Qué adjunto acepta. */
  adjunto: "cualquiera" | "video" | "foto" | null;
  inicial: string;
}[] = [
  {
    clave: "seg1",
    grupo: "seguimiento",
    l: "Mensaje 1",
    ayuda: "Primer seguimiento, cuando aún no responde.",
    adjunto: "cualquiera",
    inicial: "Hola {nombre}, {saludo}. Soy {asesor}. ¿Pudo revisar lo que conversamos? Quedo atento a cualquier duda que tenga.",
  },
  {
    clave: "seg2",
    grupo: "seguimiento",
    l: "Mensaje 2",
    ayuda: "Si sigue sin responder: aporta algo de valor.",
    adjunto: "cualquiera",
    inicial:
      "Hola {nombre}, {saludo}. Le comparto algo que le puede servir para cuidar su salud y su economía. Si le parece, lo revisamos juntos en 15 minutos.",
  },
  {
    clave: "seg3",
    grupo: "seguimiento",
    l: "Mensaje 3",
    ayuda: "Último, sin presionar: deja la puerta abierta.",
    adjunto: "cualquiera",
    inicial:
      "Hola {nombre}, {saludo}. No quiero ser insistente: si ahora no es el momento, lo entiendo perfectamente. Cuando desee retomar, quedo a sus órdenes. Un cordial saludo.",
  },
  {
    clave: "saludoTexto",
    grupo: "saludo",
    l: "Saludo de texto",
    ayuda: "Solo texto.",
    adjunto: null,
    inicial: "Hola {nombre}, ¡{saludo}! Le escribo para saludarle y desearle {deseo}.",
  },
  {
    clave: "saludoVideo",
    grupo: "saludo",
    l: "Saludo con video",
    ayuda: "Texto + un video de hasta 30 MB.",
    adjunto: "video",
    inicial: "Hola {nombre}, {saludo}. Le comparto este video. ¡Que tenga {deseo}!",
  },
  {
    clave: "saludoFoto",
    grupo: "saludo",
    l: "Saludo con foto",
    ayuda: "Texto + una foto.",
    adjunto: "foto",
    inicial: "Hola {nombre}, ¡{saludo}! Un cordial saludo y que tenga {deseo}.",
  },
  {
    clave: "presentacion",
    grupo: "saludo",
    l: "Presentación (si no le tiene registrado)",
    ayuda: "Se agrega al saludo de los contactos que aún no tienen su número registrado, después de la primera frase.",
    adjunto: null,
    inicial: "Le saluda {asesor}, {rol}. Quedo a sus órdenes en todo lo relacionado con su salud y la de su familia.",
  },
  {
    clave: "invitacion",
    grupo: "invitacion",
    l: "Invitación a la reunión",
    ayuda: "Se envía por WhatsApp o por correo. Es distinta al recordatorio de la reunión.",
    adjunto: "cualquiera",
    inicial:
      "Hola {nombre}, {saludo}. Soy {asesor}, {rol}. Me gustaría invitarle a una reunión para conocer su situación y lo que es importante para usted: {fecha} a las {hora}{lugar}. ¿Le queda bien?",
  },
  // Cadena de referidos: los textos de fábrica están en config/referidos.ts.
  ...CADENA_REFERIDO.map((c, i) => ({
    clave: `ref${i + 1}` as ClaveMensaje,
    grupo: "referidos" as const,
    l: `Referido ${i + 1}: ${c.l}`,
    ayuda: [
      "El saludo: primer mensaje al referido, de parte de quien lo refirió.",
      "Después de que responde: la asesoría de regalo y pedir día y hora.",
      "Opcional, si no responde.",
    ][i] ?? "",
    adjunto: null,
    inicial: c.t,
  })),
];
