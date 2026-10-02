/**
 * Gamificación. Todo aquí es PROPUESTA del asesor, no dato de SaludSA:
 * ajustar libremente.
 */

export const NIVELES: readonly { n: string; xp: number }[] = [
  { n: "Aprendiz", xp: 0 },
  { n: "Explorador", xp: 150 },
  { n: "Cazador", xp: 500 },
  { n: "Estratega", xp: 1200 },
  { n: "Leyenda", xp: 2500 },
];

/** XP extra cuando la etapa es "Cerrado". */
export const XP_CIERRE = 100;

/** XP de la declaración de preexistencias. */
export const XP_PRE = {
  /** Por zona revisada (sin antecedentes o con antecedentes). */
  zona: 4,
  /** Por condición documentada. */
  condicion: 2,
  /** Bonus por persona con escaneo completo (las 16 zonas). */
  escaneoCompleto: 30,
  /** Por persona que responde "No, ninguna". */
  sinPreexistencias: 10,
} as const;

/** Prospectos necesarios para la insignia de cartera. */
export const INSIGNIA_PROSPECTOS = 10;
