/** Reuniones: modalidades, duración del evento en el calendario y zona horaria. Editables. */
export type ModoReunion = "presencial" | "zoom" | "meet";

export const MODOS_REUNION: readonly { id: ModoReunion; l: string }[] = [
  { id: "presencial", l: "Presencial" },
  { id: "zoom", l: "Zoom" },
  { id: "meet", l: "Google Meet" },
];

/** Duración del evento en Google Calendar (minutos). */
export const DURACION_REUNION_MIN = 60;

/** Zona horaria del evento en Google Calendar. */
export const CODIGO_ZONA = "America/Guayaquil";
