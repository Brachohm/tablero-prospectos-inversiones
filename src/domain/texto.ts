/**
 * Texto para enviar fuera de la app (WhatsApp, SMS, correo, copiar). Muchos
 * teléfonos y programas de correo convierten los emojis de un enlace en
 * signos raros ("??", "�"), así que se quitan antes de enviar.
 */

// Pictogramas, banderas, tonos de piel, selectores de variación, unión (ZWJ), tecla (keycap) y etiquetas.
const EMOJI =
  /\p{Extended_Pictographic}|[\u{1F1E6}-\u{1F1FF}]|[\u{1F3FB}-\u{1F3FF}]|\u{FE0E}|\u{FE0F}|\u{200D}|\u{20E3}|[\u{E0020}-\u{E007F}]/gu;

/** Quita los emojis y arregla los espacios que quedan. Conserva tildes, ñ, ¿¡ y saltos de línea. */
export function sinEmojis(s: string): string {
  return s
    .replace(EMOJI, "")
    .split("\n")
    .map((l) =>
      l
        .replace(/[ \t]{2,}/g, " ")
        .replace(/ +([,.;:!?)])/g, "$1")
        .replace(/([¿¡(]) +/g, "$1")
        .trim(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function tieneEmojis(s: string): boolean {
  EMOJI.lastIndex = 0;
  const r = EMOJI.test(s);
  EMOJI.lastIndex = 0;
  return r;
}
