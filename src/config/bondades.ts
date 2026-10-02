/**
 * Cómo se reconocen y ordenan las bondades de un plan en sus PDF. Editables.
 * Solo se toman frases escritas en los documentos (tal cual): esto solo las
 * clasifica. Palabras en minúsculas y sin tildes.
 */
import type { IdConcepto } from "./coberturas";

export type IdCategoria = "grave" | "diario" | "familia" | "servicios" | "dinero" | "exterior";

/** Grupos de bondades, en el orden en que se muestran (al clasificar, los más específicos se revisan primero). */
export const CATEGORIAS: readonly { id: IdCategoria; l: string; re: RegExp }[] = [
  { id: "grave", l: "Protección ante lo grave", re: /hospital|emergencia|urgencia|cirugi|oncolog|cancer|grave|catastrof|cuidados intensivos|terapia intensiva|trasplant|dialisis|maxim|suma asegurada/ },
  { id: "familia", l: "Para la familia", re: /maternidad|parto|embaraz|cesarea|pediatr|recien nacid|vacun|nin[oa]s|hij[oa]s|neonat|prenatal/ },
  { id: "servicios", l: "Servicios incluidos", re: /telemedicina|teleconsulta|videoconsulta|ambulancia|domicilio|asistencia|chequeo|preventiv|odontolog|dental|optic|lentes|app\b|aplicacion|segunda opinion|orientacion medica|nutricion|psicolog|bienestar|gimnasio|descuento|farmacia/ },
  { id: "dinero", l: "Su dinero y sus trámites", re: /reembols|deducible|copago|coaseguro|sin costo|gratuit|credito|pago directo|sin desembolso|devolucion|ahorro/ },
  { id: "exterior", l: "Fuera del país", re: /exterior|internacional|extranjer|fuera del pais|viaje/ },
  { id: "diario", l: "Su salud en el día a día", re: /consulta|ambulatori|medicin|medicament|examen|laboratorio|imagen|rayos|ecograf|tomograf|resonancia|rehabilit|fisioterap|terapia|especialista/ },
];

/** Orden para clasificar: lo específico antes que lo general ("Telemedicina ilimitada" es un servicio). */
export const ORDEN_CLASIFICAR: readonly IdCategoria[] = ["servicios", "familia", "exterior", "dinero", "grave", "diario"];

/** Una frase tangible: dice un dato concreto (%, $, días, horas, 24/7, cantidad) o nombra un servicio concreto. */
export const TANGIBLE = /\d\s?%|\$\s?\d|\d+\s?(usd|dolares|dias|horas|meses|anos|consultas|sesiones|veces)\b|24\s?\/\s?7|24 horas|ilimitad|sin costo|gratuit|sin tope|sin limite|sin deducible|sin copago|incluye|incluido|cubre|cubiert|acceso|red de|telemedicina|ambulancia|domicilio|asistencia|chequeo|vacun|odontolog|optic|descuento|segunda opinion|pago directo|reembols/;

/** Conceptos de la tabla que van en el resumen gráfico, en orden de importancia. */
export const DESTACADOS: readonly { id: IdConcepto; l: string }[] = [
  { id: "maximo", l: "Cobertura máxima" },
  { id: "hospitalaria", l: "Hospitalización y cirugía" },
  { id: "emergencias", l: "Emergencias" },
  { id: "ambulatoria", l: "Consultas" },
  { id: "medicinas", l: "Medicinas" },
  { id: "examenes", l: "Exámenes" },
  { id: "maternidad", l: "Maternidad" },
  { id: "deducible", l: "Deducible" },
  { id: "copago", l: "Copago" },
  { id: "reembolso", l: "Reembolso" },
  { id: "telemedicina", l: "Telemedicina" },
  { id: "exterior", l: "En el exterior" },
  { id: "odontologia", l: "Odontología" },
  { id: "preexistencias", l: "Preexistencias" },
];

export const MAX_DESTACADOS = 8;
export const MAX_BONDADES = 14;
