/**
 * Objeciones que el prospecto puede plantear en la segunda reunión. En el
 * informe no se nombran: salen como preguntas frecuentes pensadas para
 * resolverlas. Honestas: no prometen coberturas (eso se
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
    id: "precio",
    l: "Está caro / no me alcanza",
    titulo: "¿Cómo puedo ajustar la cuota a mi presupuesto?",
    respuesta:
      "Podemos ajustar el deducible o el plan para cuidar su cuota sin perder lo esencial: hospitalización y cirugía. Vale la pena comparar la cuota con lo que costaría un solo evento sin seguro.",
    etiqueta: "obj:Precio",
  },
  {
    id: "pensar",
    l: "Lo tengo que pensar",
    titulo: "¿Cuánto tiempo tengo para decidir?",
    respuesta:
      "Tómese el tiempo que necesite: este resumen es para revisarlo con calma. Tenga en cuenta que los tiempos de espera empiezan a correr desde que contrata.",
    etiqueta: "obj:Lo tengo que pensar",
  },
  {
    id: "pareja",
    l: "Lo consulto con mi pareja o familia",
    titulo: "¿Puede participar mi familia en la decisión?",
    respuesta:
      "Por supuesto. Podemos hacer una llamada corta con quien decide con usted para resolver sus dudas: la protección es para todos.",
    etiqueta: "familia",
  },
  {
    id: "tengo",
    l: "Ya tengo seguro",
    titulo: "¿Me conviene si ya tengo un seguro?",
    respuesta:
      "Comparamos línea por línea lo que tiene con lo que le propongo. Si su plan actual le conviene más, se lo digo con total honestidad.",
    etiqueta: "obj:Ya tengo seguro",
  },
  {
    id: "antiguedad",
    l: "Perder antigüedad o carencias",
    titulo: "¿Qué pasa con mi antigüedad y mis preexistencias?",
    respuesta:
      "Antes de cambiar validamos con la aseguradora cómo se reconocen su antigüedad y sus preexistencias, y su póliza actual se mantiene hasta que la nueva esté vigente.",
    etiqueta: "obj:Perder antigüedad o carencias",
  },
  {
    id: "iess",
    l: "Tengo el IESS",
    titulo: "¿En qué se diferencia del IESS?",
    respuesta:
      "El IESS es una buena base. Un seguro privado lo complementa: atención más rápida, libertad para elegir médico y clínica, y respaldo en eventos de alto costo.",
    etiqueta: "general",
  },
  {
    id: "necesito",
    l: "No lo necesito ahora / estoy sano",
    titulo: "¿Por qué contratar cuando estoy sano?",
    respuesta:
      "El mejor momento para contratar es cuando se está sano: hay menos que declarar y los tiempos de espera se cumplen antes. Nadie planifica una emergencia.",
    etiqueta: "emergencia",
  },
  {
    id: "reembolsos",
    l: "Desconfío de los reembolsos",
    titulo: "¿Cómo funcionan los reembolsos?",
    respuesta:
      "Le explico el proceso paso a paso, qué documentos guardar, y le acompaño en cada reembolso hasta que se pague.",
    etiqueta: "mot:reembolsos",
  },
];
