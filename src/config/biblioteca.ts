/**
 * Biblioteca y armador de ofertas: listas editables.
 *
 * Nada de esto es información de la aseguradora: son categorías y ayudas del asesor.
 * Lo que dependa de la aseguradora (fondos, costos, rescates) lo carga el
 * asesor desde el material oficial y la app lo muestra con "validar con la aseguradora".
 */
import type { TipoDoc } from "../domain/biblioteca";

export const TIPOS_DOC: readonly { id: TipoDoc; l: string }[] = [
  { id: "condiciones", l: "Condiciones generales" },
  { id: "anexo", l: "Ficha del plan o de los fondos" },
  { id: "tarifas", l: "Proyecciones y costos" },
  { id: "otro", l: "Otro material" },
];

/**
 * Etiquetas para encontrar el argumento justo en cada ficha.
 * `obj:` = objeción principal, `mot:` = motivo de inconformidad,
 * `crit:` = criterio de elección, el resto sale de los datos de la ficha.
 */
export const ETIQUETAS_ARGUMENTO: readonly { id: string; l: string }[] = [
  { id: "obj:No tengo dinero ahora", l: "Objeción: no tengo dinero ahora" },
  { id: "obj:Ya tengo ahorros", l: "Objeción: ya tengo ahorros" },
  { id: "obj:Lo tengo que pensar", l: "Objeción: lo tengo que pensar" },
  { id: "obj:Desconfío de las inversiones", l: "Objeción: desconfianza" },
  { id: "mot:rendimiento", l: "Rendimiento bajo" },
  { id: "mot:costos", l: "Comisiones y costos" },
  { id: "mot:liquidez", l: "Liquidez o penalidades" },
  { id: "mot:transparencia", l: "Poca transparencia" },
  { id: "mot:riesgo", l: "Riesgo o volatilidad" },
  { id: "mot:atencion", l: "Atención y asesoría" },
  { id: "familia", l: "Familia y dependientes" },
  { id: "mayor", l: "Cerca del retiro" },
  { id: "emergencia", l: "Fondo de emergencia" },
  { id: "general", l: "General" },
];

/**
 * Bonos que el asesor sí puede cumplir por su cuenta (no dependen de la aseguradora).
 * Se proponen al armar la oferta; el valor en USD lo pone el asesor.
 */
export const BONOS_ASESOR: readonly string[] = [
  "Revisión semestral de sus fondos y de su avance hacia la meta",
  "Le ayudo con el KYC y la documentación para que la emisión salga sin rechazos",
  "Le aviso cuándo conviene reequilibrar o hacer aportes extra",
  "Línea directa conmigo por WhatsApp para cualquier duda",
];

/** Las cuatro palancas de la ecuación de valor (Alex Hormozi, "$100M Offers"). */
export const PALANCAS = [
  {
    id: "sueno",
    l: "Resultado soñado",
    ayuda: "Lo que de verdad quiere lograr, con sus palabras. Más grande y concreto = más valor.",
    sube: true,
  },
  {
    id: "prueba",
    l: "Probabilidad de lograrlo",
    ayuda: "Por qué te puede creer: casos reales, respaldo, historial de los fondos según el material oficial (sin garantizar).",
    sube: true,
  },
  {
    id: "tiempo",
    l: "Tiempo hasta sentirlo",
    ayuda: "Qué recibe rápido: su estado de cuenta desde el primer mes, la cobertura de vida desde la emisión.",
    sube: false,
  },
  {
    id: "esfuerzo",
    l: "Esfuerzo que le quitas",
    ayuda: "Lo que tú haces por la persona: trámites, KYC, elegir fondos, comparar opciones.",
    sube: false,
  },
] as const;
