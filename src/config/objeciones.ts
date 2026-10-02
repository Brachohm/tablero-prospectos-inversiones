/**
 * Objeciones que el prospecto puede plantear en la segunda reunión. En el
 * informe no se nombran: salen como preguntas frecuentes pensadas para
 * resolverlas. Honestas: no prometen rendimientos (eso se
 * valida con la aseguradora). Trato de usted. `etiqueta` busca además un argumento de tu
 * Biblioteca para reforzarla. Editables.
 */
export interface ObjecionReunion {
  id: string;
  /** Cómo la dijo el prospecto. */
  l: string;
  /** Pregunta frecuente que la resuelve en el informe (sin nombrar la objeción). */
  titulo: string;
  respuesta: string;
  etiqueta: string;
}

export const OBJECIONES_REUNION: readonly ObjecionReunion[] = [
  {
    id: "dinero",
    l: "No tengo dinero ahora / no me alcanza",
    titulo: "¿Con cuánto puedo empezar?",
    respuesta:
      "Podemos empezar con un aporte que pueda sostener sin apretar su presupuesto. Lo que más pesa en el resultado es el tiempo y la constancia, no el monto inicial.",
    etiqueta: "obj:No tengo dinero ahora",
  },
  {
    id: "pensar",
    l: "Lo tengo que pensar",
    titulo: "¿Cuánto tiempo tengo para decidir?",
    respuesta:
      "Tómese el tiempo que necesite: este resumen es para revisarlo con calma. Tenga en cuenta que cada mes que pasa es un mes menos de interés compuesto a su favor.",
    etiqueta: "obj:Lo tengo que pensar",
  },
  {
    id: "pareja",
    l: "Lo consulto con mi pareja o familia",
    titulo: "¿Puede participar mi familia en la decisión?",
    respuesta:
      "Por supuesto. Podemos hacer una llamada corta con quien decide con usted para resolver sus dudas: la meta suele ser de toda la familia.",
    etiqueta: "familia",
  },
  {
    id: "ahorros",
    l: "Ya tengo ahorros",
    titulo: "¿Me conviene si ya tengo ahorros o inversiones?",
    respuesta:
      "Comparamos lo que tiene con lo que le propongo: rendimiento neto, costos, liquidez y plazo. Si lo suyo le conviene más, se lo digo con total honestidad.",
    etiqueta: "obj:Ya tengo ahorros",
  },
  {
    id: "desconfianza",
    l: "Desconfío de las inversiones",
    titulo: "¿Qué tan seguro está mi dinero?",
    respuesta:
      "Le muestro quién emite el plan, cómo está regulado en Ecuador y cómo consulta su saldo. Los rendimientos no están garantizados: por eso elegimos fondos acordes a su perfil.",
    etiqueta: "obj:Desconfío de las inversiones",
  },
  {
    id: "rescate",
    l: "¿Y si necesito el dinero antes?",
    titulo: "¿Qué pasa si necesito retirar antes de tiempo?",
    respuesta:
      "Le explico la tabla de rescates año por año y cuándo puede retirar sin penalidad. Por eso recomendamos tener primero un fondo de emergencia.",
    etiqueta: "mot:liquidez",
  },
  {
    id: "banco",
    l: "Mejor lo dejo en el banco",
    titulo: "¿En qué se diferencia de una cuenta de ahorros o un plazo fijo?",
    respuesta:
      "La cuenta de ahorros da liquidez, pero la inflación le quita poder de compra. Un plan de largo plazo busca hacer crecer su dinero para una meta concreta, con disciplina de aporte.",
    etiqueta: "general",
  },
];
