/**
 * Escenarios de la proyección del plan: rendimiento anual SUPUESTO, no
 * garantizado. Se editan en Configuración → Perfil → Escenarios.
 */
export interface Escenarios {
  conservador: number;
  moderado: number;
  optimista: number;
}

export const ESCENARIOS_INICIALES: Escenarios = { conservador: 2, moderado: 4, optimista: 6 };

export const ESCENARIOS_L: Record<keyof Escenarios, string> = {
  conservador: "Conservador",
  moderado: "Moderado",
  optimista: "Optimista",
};

/** Años que se marcan en la tabla de la proyección (además del último). */
export const HITOS_ANIOS = [1, 5, 10, 15, 20, 25, 30] as const;

export const AVISO_PROYECCION =
  "Proyección referencial con rendimientos supuestos, antes de costos del plan. No es una promesa: los rendimientos de un unit linked no están garantizados y dependen de los fondos. Validar con la proyección oficial de la aseguradora.";
