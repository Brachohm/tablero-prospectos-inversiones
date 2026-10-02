/** Saludo, fecha y frase del día para el dashboard. */
import { FRASES } from "../config/frases";

/** Saludo para los mensajes, en minúsculas: "buenos días", "buenas tardes" o "buenas noches". */
export function saludoMensaje(hora: number = new Date().getHours()): string {
  return saludoHora(hora).toLowerCase();
}

/** Buen deseo según la hora: "un excelente día", "una excelente tarde" o "una linda noche". */
export function deseoHora(hora: number = new Date().getHours()): string {
  if (hora >= 5 && hora < 12) return "un excelente día";
  if (hora >= 12 && hora < 19) return "una excelente tarde";
  return "una linda noche";
}

/**
 * Pone el saludo de la hora en un mensaje ya escrito: cambia "buenos días",
 * "buenas tardes" o "buenas noches" por el que corresponde (respeta la mayúscula).
 */
export function ajustarSaludo(texto: string, hora: number = new Date().getHours()): string {
  const s = saludoMensaje(hora);
  return texto.replace(/\b(buen[oa]s)\s+(d[ií]as|tardes|noches)\b/gi, (m) =>
    m[0] === m[0].toUpperCase() ? s[0].toUpperCase() + s.slice(1) : s,
  );
}

export function saludoHora(hora: number): string {
  if (hora >= 5 && hora < 12) return "Buenos días";
  if (hora >= 12 && hora < 19) return "Buenas tardes";
  return "Buenas noches";
}

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

/** "Miércoles, 7 de octubre de 2026" */
export function fechaHoyLarga(hoy: string): string {
  const [a, m, d] = hoy.split("-").map(Number);
  const dia = DIAS[new Date(Date.UTC(a, m - 1, d)).getUTCDay()];
  return `${dia[0].toUpperCase()}${dia.slice(1)}, ${d} de ${MESES[m - 1]} de ${a}`;
}

/** Una frase distinta cada día del año. */
export function fraseDelDia(hoy: string, frases: readonly string[] = FRASES): string {
  const [a, m, d] = hoy.split("-").map(Number);
  const dia = Math.floor((Date.UTC(a, m - 1, d) - Date.UTC(a, 0, 1)) / 86400000);
  return frases[(dia + a) % frases.length];
}
