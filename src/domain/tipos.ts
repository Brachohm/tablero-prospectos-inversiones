/** Tipos del dominio. La configuración editable vive en `src/config/`. */

export type Tipo = "nuevo" | "cambio";

export type MotivoId =
  | "rendimiento"
  | "costos"
  | "liquidez"
  | "transparencia"
  | "riesgo"
  | "atencion"
  | "otro";

export type TipoCampo =
  | "text"
  | "tel"
  | "email"
  | "datetime-local"
  | "number"
  | "date"
  | "select"
  | "textarea"
  | "check"
  | "motivos"
  | "contactos";

export interface Campo {
  /** Clave del campo en el objeto Prospecto. */
  k: string;
  /** Etiqueta visible. */
  l: string;
  t: TipoCampo;
  /** Opciones (solo `select`). */
  o?: readonly string[];
  /** XP al llenarlo (en `contactos`, XP por contacto del historial, hasta 5). */
  xp: number;
  /** Solo aplica a este tipo de ficha. */
  solo?: Tipo;
  /** Solo aplica si este motivo de inconformidad está elegido. */
  motivo?: MotivoId;
  /** Solo aplica si el campo `k` vale `v` (p. ej. origen = "Referido"); `v: "*"` = si `k` tiene algo escrito; `v: "!X"` = si `k` no vale X. */
  cuando?: { k: string; v: string };
  /** Subtítulo del grupo al que pertenece (dentro de la sección). */
  grupo?: string;
  /** Texto de ayuda dentro del campo. */
  ph?: string;
  /** No cuenta para el avance (la etapa). */
  noCount?: boolean;
  /** Ocupa todo el ancho en la interfaz. */
  ancho?: boolean;
  /** Límites para campos numéricos. */
  min?: number;
  max?: number;
}

export type MisionId = "datos" | "desc" | "fin" | "riesgo" | "pre";

export interface Mision {
  id: MisionId;
  titulo: string;
  solo?: Tipo;
  /** Componente propio en vez de lista de campos (el escáner del cuerpo). */
  custom?: boolean;
  campos: readonly Campo[];
}

export type Sexo = "" | "Mujer" | "Hombre";

export interface Persona {
  id: string;
  rol: string;
  nombre: string;
  /** Edad en años, tal como se escribió. Para el titular se usa `Prospecto.edad`. */
  edad: string;
  sexo: Sexo;
  /** Talla, tal como se escribió, y su unidad (m por defecto). */
  talla?: string;
  tallaU?: "m" | "cm";
  /** Peso, tal como se escribió, y su unidad (kg por defecto). */
  peso?: string;
  pesoU?: "kg" | "lb";
  /** Número de identificación (cédula o pasaporte) y fechas del documento (AAAA-MM-DD). */
  ident?: string;
  identEmision?: string;
  identExpira?: string;
}

export type EstadoCondicion = "En tratamiento" | "En estudio" | "Controlado" | "Resuelto";

export interface DetalleCondicion {
  /** Año. */
  a?: string;
  /** Estado. */
  e?: EstadoCondicion | "";
  /** Tratamiento o medicación. */
  t?: string;
}

export interface DatoZona {
  /** Confirmada "sin antecedentes". */
  ok?: boolean;
  /** Condiciones marcadas: id de condición → detalle. */
  it?: Record<string, DetalleCondicion>;
  /** Otra condición escrita a mano. */
  otra?: string;
}

/** personaId → zonaId → dato. */
export type Declaracion = Record<string, Record<string, DatoZona>>;

export type NivelVeredicto = "viable" | "condiciones" | "no_recomendable" | "falta_informacion";
export type TipoCausa = "producto" | "uso" | "contratacion" | "mixta" | "indeterminada";

export interface Veredicto {
  nivel: NivelVeredicto;
  titulo: string;
  razon: string;
}

export interface Causa {
  tipo: TipoCausa;
  explicacion: string;
}

export type Canal = "WhatsApp" | "SMS" | "Llamada" | "Reunión" | "Correo" | "Otro";

/** Un contacto del historial (CRM). */
export interface Contacto {
  id: string;
  /** Día del contacto (AAAA-MM-DD). */
  fecha: string;
  canal: Canal;
  nota: string;
  /** Momento en que se registró (ms). */
  ts: number;
}

export interface Consentimiento {
  /** Momento en que se marcó la casilla (ms). */
  ts: number;
}

export type ResultadoGestion = "no_contesto" | "volver" | "interesado" | "info" | "reunion" | "no_interesado";

/** Una gestión del Centro de Gestión: lo que se hizo y el resumen (obligatorio). */
export interface Gestion {
  id: string;
  /** AAAA-MM-DD */
  fecha: string;
  ts: number;
  resultado: ResultadoGestion;
  resumen: string;
  /** Acciones hechas: "Llamada", "Saludo", "Seguimiento 2", "Invitación"… */
  acciones: string[];
}

export interface Soltado {
  fecha: string;
  motivo: string;
}

/** Un bono de la oferta: algo que recibe además del plan. */
export interface Bono {
  id: string;
  t: string;
  /** Valor estimado en USD (texto, puede quedar vacío). */
  valor: string;
}

/** Oferta tipo Hormozi: las cuatro palancas de valor, bonos, garantía y urgencia. */
export interface Oferta {
  /** Plan de la biblioteca. */
  planId?: string;
  nombre?: string;
  sueno?: string;
  prueba?: string;
  tiempo?: string;
  esfuerzo?: string;
  bonos?: Bono[];
  garantia?: string;
  urgencia?: string;
}

/** Una reunión que ya se hizo. */
export interface ReunionHecha {
  /** Número de reunión (1 = recolección, 2 = propuesta, 3+ = caso especial). */
  n: number;
  /** AAAA-MM-DD */
  fecha: string;
}

/** Un referido que la persona quiere obsequiar con la asesoría. */
export interface ReferidoPedido {
  id: string;
  nombre: string;
  celular: string;
  relacion: string;
  /** Contacto creado en la Base de datos. */
  contactoId?: string;
}

/** Producto elegido en el pre-cierre. */
export interface ProductoCierre {
  id: string;
  /** Plan de la Biblioteca (si se eligió de ahí). */
  planId?: string;
  nombre: string;
  /** Monto de deducible (USD, texto). */
  deducible: string;
  /** Valor a pagar mensual (USD, texto). */
  mensual: string;
}

/** Archivo cargado en el cierre (el contenido vive en la tabla de archivos). */
export interface DocCierre {
  nombre: string;
  tipo: string;
  bytes: number;
}

/**
 * Un prospecto es un objeto plano: metadatos + un campo por clave de la ficha
 * (ver `MISIONES`). Los valores de los campos se guardan tal como se escriben
 * (texto), salvo los checks (booleanos).
 */
export interface Prospecto {
  id: string;
  creado: number;
  mod: number;
  tipo: Tipo;
  etapa: string;
  /** Historial de contactos, del más antiguo al más reciente. */
  historial?: Contacto[];
  /** Id del cliente que lo refirió. */
  referidoPor?: string;
  consentimiento?: Consentimiento;
  motivos?: MotivoId[];
  rec?: Record<string, boolean>;
  personas?: Persona[];
  preSN?: Record<string, "si" | "no" | "">;
  pre?: Declaracion;
  /** Se abrió a mano la declaración de preexistencias (antes de la etapa de cotización). */
  cotizar?: boolean;
  /** Día en que pasó a "Cerrado" (AAAA-MM-DD), para el objetivo mensual. */
  cerradoEn?: string;
  /** Cadena de mensajes de referido: día en que se envió cada paso. */
  cadena?: (string | null)[];
  /** Seguimiento 1-2-3: día en que se envió cada mensaje. */
  seguimiento?: string[];
  /** Día en que respondió (detiene el seguimiento). */
  segRespondio?: string;
  /** Vueltas anteriores del seguimiento (cuando contestó y se empezó de nuevo). */
  segVueltas?: { enviados: string[]; respondio?: string }[];
  /** Cambio de seguro: tabla de coberturas de su plan actual. */
  planActual?: { tabla: Partial<Record<string, string>>; archivo?: string };
  /** Informe post reunión enviado. */
  postReunion?: { fecha: string; canal: string };
  /** Recordatorios 1 y 2 enviados de la reunión agendada. */
  recordatorios?: { reunion: string; r1?: number; r2?: number };
  /** Informe de la segunda reunión (propuesta) enviado. */
  postReunion2?: { fecha: string; canal: string };
  /** Objeciones que planteó en la segunda reunión (ids de OBJECIONES_REUNION). */
  objeciones2?: string[];
  /** Otra objeción, con sus palabras. */
  objecionOtra?: string;
  /** Calificación de la asesoría que dio la persona (1 a 5). */
  calificacion?: { valor: number; fecha: string };
  gestiones?: Gestion[];
  /** Gestión finalizada sin borrar la ficha. */
  soltado?: Soltado;
  /** Contacto nuevo del que salió esta ficha. */
  contactoId?: string;
  /** Oferta armada para esta ficha (ecuación de valor). */
  oferta?: Oferta;
  /** Reuniones realizadas (normalmente 2). */
  reunionesHechas?: ReunionHecha[];
  /** Motivo de una reunión extra (caso especial). */
  reunionExtra?: string;
  /** Los 3 referidos que se piden en la primera (o segunda) reunión. */
  referidos?: ReferidoPedido[];
  /** Pre-cierre: productos que eligió. */
  productos?: ProductoCierre[];
  /** Cerrado: documentos cargados (comprobante, contrato, preexistencias). */
  docsCierre?: Partial<Record<string, DocCierre>>;
  [campo: string]: unknown;
}

export interface GrupoCondiciones {
  titulo: string;
  /** Si se indica, el grupo solo se muestra a personas de ese sexo (o sin sexo indicado). */
  sexo?: "Mujer" | "Hombre";
  condiciones: readonly { id: string; l: string }[];
}

export interface Zona {
  id: string;
  nombre: string;
  icono: string;
  pista: string;
  grupos: readonly GrupoCondiciones[];
}
