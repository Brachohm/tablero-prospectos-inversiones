/**
 * Argumentos según el tipo de póliza actual (cambio de seguro). Editables.
 * Son características generales de cada tipo de seguro: lo particular de su
 * póliza (topes, exclusiones, condiciones) se revisa en su documento.
 */
import { VALIDAR } from "./saludsa";

export interface ArgumentoPoliza {
  titulo: string;
  /** Respuesta a "mi seguro actual es más barato". */
  precio: string;
  puntos: string[];
}

export const ARGUMENTOS_POLIZA: Readonly<Record<"Masivo" | "Corporativo", ArgumentoPoliza>> = {
  Masivo: {
    titulo: "Su seguro actual es masivo",
    precio:
      "Un seguro masivo cuesta poco porque está hecho para muchas personas a la vez, con las mismas condiciones para todos: por eso conviene comparar lo que cubre de verdad (montos, topes y exclusiones), no solo lo que cuesta.",
    puntos: [
      "Está diseñado para muchas personas a la vez: sus coberturas, montos y topes suelen ser más acotados. Vale la pena revisar los de su póliza.",
      "Un plan individual se arma a su medida: usted elige coberturas, deducible y red según lo que necesita.",
      "Un precio bajo no ayuda si, cuando lo usa, no responde: lo que cuenta es cuánto le cubre en una hospitalización o cirugía.",
    ],
  },
  Corporativo: {
    titulo: "Su seguro actual es corporativo",
    precio:
      "Su seguro corporativo parece más económico porque lo negocia o lo paga en parte su empresa o institución, pero le cubre solo mientras siga vinculado a ella (o mientras estudie): uno propio no depende de eso.",
    puntos: [
      "Le cubre mientras esté vinculado a la empresa o institución, o mientras estudie: si cambia de trabajo, le desvinculan o termina sus estudios, esa cobertura se acaba.",
      "Su precio es bajo porque lo negocia o lo paga en parte la empresa; las condiciones las decide ella y pueden cambiar en cada renovación.",
      "Un plan individual es suyo: no depende de su trabajo ni de sus estudios, y la antigüedad que acumula se queda con usted.",
      `Si llegara a tener una condición de salud, contratar uno propio cuando ya no tenga el corporativo puede ser más difícil: es mejor tenerlo antes (${VALIDAR}).`,
    ],
  },
};
