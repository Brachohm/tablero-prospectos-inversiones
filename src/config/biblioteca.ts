/**
 * Biblioteca y armador de ofertas: listas editables.
 *
 * Nada de esto es información de SaludSA: son categorías y ayudas del asesor.
 * Lo que dependa de SaludSA (coberturas, carencias, garantías) lo carga el
 * asesor desde el material oficial y la app lo muestra con "validar con la aseguradora".
 */
import type { TipoDoc } from "../domain/biblioteca";

export const TIPOS_DOC: readonly { id: TipoDoc; l: string }[] = [
  { id: "condiciones", l: "Condiciones generales" },
  { id: "anexo", l: "Anexo de plan" },
  { id: "tarifas", l: "Tarifas" },
  { id: "otro", l: "Otro material" },
];

/**
 * Etiquetas para encontrar el argumento justo en cada ficha.
 * `obj:` = objeción principal, `mot:` = motivo de inconformidad,
 * `crit:` = criterio de elección, el resto sale de los datos de la ficha.
 */
export const ETIQUETAS_ARGUMENTO: readonly { id: string; l: string }[] = [
  { id: "obj:Precio", l: "Objeción: precio" },
  { id: "obj:Ya tengo seguro", l: "Objeción: ya tengo seguro" },
  { id: "obj:Lo tengo que pensar", l: "Objeción: lo tengo que pensar" },
  { id: "obj:Perder antigüedad o carencias", l: "Objeción: perder antigüedad o carencias" },
  { id: "mot:cobertura", l: "Cobertura" },
  { id: "mot:reembolsos", l: "Reembolsos" },
  { id: "mot:precio", l: "Precio o alzas" },
  { id: "mot:deducibles", l: "Deducibles y copagos" },
  { id: "mot:red", l: "Red de médicos y clínicas" },
  { id: "mot:atencion", l: "Atención y servicio" },
  { id: "poliza:masivo", l: "Su seguro actual es masivo" },
  { id: "poliza:corporativo", l: "Su seguro actual es corporativo" },
  { id: "familia", l: "Familia y dependientes" },
  { id: "mayor", l: "Edad mayor" },
  { id: "emergencia", l: "Emergencias y cirugías" },
  { id: "general", l: "General" },
];

/**
 * Bonos que el asesor sí puede cumplir por su cuenta (no dependen de SaludSA).
 * Se proponen al armar la oferta; el valor en USD lo pone el asesor.
 */
export const BONOS_ASESOR: readonly string[] = [
  "Le acompaño en cada reembolso hasta que se pague",
  "Le ayudo a llenar bien la declaración de salud para evitar rechazos",
  "Revisión anual de su plan antes de cada renovación",
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
    ayuda: "Por qué te puede creer: casos reales, respaldo, lo que sí cubre según el material oficial.",
    sube: true,
  },
  {
    id: "tiempo",
    l: "Tiempo hasta sentirlo",
    ayuda: "Qué recibe rápido: desde cuándo está protegido, qué puede usar desde el primer día.",
    sube: false,
  },
  {
    id: "esfuerzo",
    l: "Esfuerzo que le quitas",
    ayuda: "Lo que tú haces por la persona: trámites, reembolsos, declaración, comparar opciones.",
    sube: false,
  },
] as const;
