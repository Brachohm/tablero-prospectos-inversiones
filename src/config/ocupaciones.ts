/**
 * Ocupación → riesgos laborales y ergonómicos frecuentes, y la atención
 * médica que más se suele necesitar. Son orientaciones generales para que la
 * persona tome conciencia (no son un diagnóstico) y se pueden editar aquí.
 * Las coberturas siempre se validan con la aseguradora.
 *
 * `nivel`: 3 = alto, 2 = medio, 1 = bajo (para el gráfico del informe).
 */
export interface Riesgo {
  t: string;
  nivel: 1 | 2 | 3;
}

export interface PerfilOcupacion {
  id: string;
  /** Nombre del grupo, para el informe. */
  l: string;
  /** Palabras que lo identifican (sin tildes, en minúsculas). */
  claves: readonly string[];
  laborales: readonly Riesgo[];
  ergonomicos: readonly Riesgo[];
  /** Atención que podría requerir (urgencia, consulta, rehabilitación…). */
  atencion: readonly string[];
  /** Argumento de valor del seguro para este trabajo (honesto, sin prometer coberturas). */
  argumento: string;
}

export const PERFILES_OCUPACION: readonly PerfilOcupacion[] = [
  {
    id: "conduccion",
    l: "Conducción y transporte",
    claves: ["chofer", "conductor", "taxi", "transport", "repartidor", "delivery", "motorizado", "camion", "bus", "uber", "mensajer"],
    laborales: [
      { t: "Accidentes de tránsito", nivel: 3 },
      { t: "Estrés y jornadas largas", nivel: 2 },
      { t: "Exposición al ruido y la contaminación", nivel: 2 },
    ],
    ergonomicos: [
      { t: "Dolor lumbar por muchas horas sentado", nivel: 3 },
      { t: "Vibración y tensión en cuello y hombros", nivel: 2 },
      { t: "Sedentarismo y sobrepeso", nivel: 2 },
    ],
    atencion: ["Emergencias y ambulancia", "Cirugía y traumatología", "Hospitalización", "Rehabilitación física"],
    argumento:
      "Pasa muchas horas en la vía: un accidente puede significar emergencia, cirugía y semanas de rehabilitación. Tener cómo cubrirlo protege sus ingresos y su familia.",
  },
  {
    id: "obra",
    l: "Construcción, industria y oficios",
    claves: ["albanil", "obrero", "construc", "operari", "mecanic", "soldad", "electric", "carpinter", "fabrica", "industri", "miner", "agricult", "plomer", "pintor", "maestro de obra"],
    laborales: [
      { t: "Caídas, golpes y cortes", nivel: 3 },
      { t: "Quemaduras y exposición a químicos", nivel: 2 },
      { t: "Ruido y polvo", nivel: 2 },
    ],
    ergonomicos: [
      { t: "Levantar y cargar peso", nivel: 3 },
      { t: "Posturas forzadas", nivel: 3 },
      { t: "Movimientos repetitivos", nivel: 2 },
    ],
    atencion: ["Emergencias", "Traumatología y cirugía", "Rehabilitación física", "Exámenes de imagen"],
    argumento:
      "Su trabajo es físico: una lesión de espalda, una fractura o un corte serio son más probables que en una oficina. La rapidez para atenderse define cuánto tiempo deja de trabajar.",
  },
  {
    id: "salud",
    l: "Salud",
    claves: ["medic", "enferm", "odontolog", "doctor", "paramedic", "laboratori", "farmac", "fisioterap", "auxiliar de enfermeria", "obstetri", "psicolog"],
    laborales: [
      { t: "Contagios e infecciones", nivel: 3 },
      { t: "Pinchazos y material cortante", nivel: 2 },
      { t: "Turnos nocturnos y estrés", nivel: 3 },
    ],
    ergonomicos: [
      { t: "Muchas horas de pie", nivel: 2 },
      { t: "Movilizar pacientes (espalda)", nivel: 3 },
      { t: "Posturas sostenidas", nivel: 2 },
    ],
    atencion: ["Exámenes y chequeos preventivos", "Consulta de especialistas", "Fisioterapia", "Salud mental"],
    argumento:
      "Cuida la salud de otros todos los días; la suya también necesita respaldo. Un contagio o una lesión de espalda por movilizar pacientes merecen atención rápida.",
  },
  {
    id: "docencia",
    l: "Docencia",
    claves: ["docente", "profesor", "maestr", "educador", "catedratic", "parvulari", "tutor"],
    laborales: [
      { t: "Problemas de la voz (disfonía)", nivel: 3 },
      { t: "Contagios respiratorios", nivel: 2 },
      { t: "Estrés y carga emocional", nivel: 2 },
    ],
    ergonomicos: [
      { t: "Muchas horas de pie", nivel: 2 },
      { t: "Cuello y espalda al calificar", nivel: 2 },
      { t: "Fatiga visual", nivel: 1 },
    ],
    atencion: ["Otorrinolaringología", "Medicina general", "Salud mental", "Fisioterapia"],
    argumento:
      "Su voz y su energía son su herramienta de trabajo. Atenderse a tiempo una disfonía o un cuadro respiratorio evita perder días de clase.",
  },
  {
    id: "comercio",
    l: "Comercio, cocina y atención al público",
    claves: ["vendedor", "comerci", "cajer", "meser", "cociner", "chef", "estilista", "peluquer", "tienda", "negocio", "panader", "atencion al cliente", "recepcionista"],
    laborales: [
      { t: "Cortes y quemaduras (cocina)", nivel: 2 },
      { t: "Estrés y horarios extendidos", nivel: 2 },
      { t: "Contacto con mucho público", nivel: 1 },
    ],
    ergonomicos: [
      { t: "Muchas horas de pie (várices)", nivel: 3 },
      { t: "Movimientos repetitivos", nivel: 2 },
      { t: "Cargar mercadería", nivel: 2 },
    ],
    atencion: ["Consulta de especialistas", "Traumatología", "Emergencias", "Exámenes preventivos"],
    argumento:
      "Si se enferma o se lesiona, su negocio o su turno se detienen. Atenderse rápido y sin descapitalizarse es lo que mantiene su ingreso.",
  },
  {
    id: "seguridad",
    l: "Seguridad y fuerza pública",
    claves: ["guardia", "policia", "militar", "bombero", "seguridad", "vigilante", "custodi"],
    laborales: [
      { t: "Lesiones y agresiones", nivel: 3 },
      { t: "Turnos nocturnos", nivel: 3 },
      { t: "Estrés y tensión", nivel: 2 },
    ],
    ergonomicos: [
      { t: "Muchas horas de pie", nivel: 2 },
      { t: "Esfuerzo físico intenso", nivel: 2 },
      { t: "Dolor de rodillas y espalda", nivel: 2 },
    ],
    atencion: ["Emergencias y ambulancia", "Cirugía y traumatología", "Hospitalización", "Salud mental"],
    argumento:
      "Su trabajo tiene riesgo físico real: una emergencia puede requerir cirugía y hospitalización. Tener ese respaldo le da tranquilidad a usted y a su familia.",
  },
  {
    id: "oficina",
    l: "Trabajo de oficina y frente a pantallas",
    claves: ["contador", "contadora", "administrat", "abogad", "ingenier", "sistemas", "programador", "desarrollador", "secretari", "oficina", "analista", "disenador", "call center", "gerente", "ejecutiv", "asesor", "banc", "auditor", "arquitect", "economista", "periodista", "marketing", "recursos humanos", "teletrabajo"],
    laborales: [
      { t: "Estrés y ansiedad", nivel: 2 },
      { t: "Sedentarismo (riesgo cardiovascular)", nivel: 3 },
      { t: "Jornadas largas", nivel: 2 },
    ],
    ergonomicos: [
      { t: "Dolor de espalda y cuello (postura sentada)", nivel: 3 },
      { t: "Muñecas y manos (túnel carpiano)", nivel: 2 },
      { t: "Fatiga visual", nivel: 2 },
    ],
    atencion: ["Chequeos cardiometabólicos", "Fisioterapia y traumatología", "Oftalmología", "Salud mental"],
    argumento:
      "El riesgo de la oficina es silencioso: postura, estrés y sedentarismo se acumulan con los años. Chequeos y atención a tiempo evitan que un problema pequeño se vuelva caro.",
  },
];

/** Si la ocupación no coincide con ningún grupo. */
export const PERFIL_GENERAL: PerfilOcupacion = {
  id: "general",
  l: "Riesgos del día a día",
  claves: [],
  laborales: [
    { t: "Accidentes en casa o en la calle", nivel: 2 },
    { t: "Estrés", nivel: 2 },
    { t: "Enfermedades de temporada", nivel: 1 },
  ],
  ergonomicos: [
    { t: "Posturas y esfuerzos del día a día", nivel: 2 },
    { t: "Sedentarismo", nivel: 2 },
    { t: "Descanso insuficiente", nivel: 1 },
  ],
  atencion: ["Medicina general", "Emergencias", "Exámenes preventivos"],
  argumento:
    "Nadie planifica una emergencia. Tener un respaldo listo hace que la decisión en ese momento sea atenderse, no cuánto va a costar.",
};
