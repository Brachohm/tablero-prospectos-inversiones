import { errorAdjunto, mensajeDe, perfilDe, rellenar, saludoDisponible, ajustesIniciales } from "./ajustes";
import { agenda } from "./crm";
import { mensajesPara } from "./mensajes";
import { textoPaso } from "./referidos";
import {
  deshacerSeguimiento,
  estadoSeguimiento,
  esDomingo,
  marcarRespondio,
  registrarSeguimiento,
  reiniciarSeguimiento,
  siguienteHabil,
  vueltasDe,
} from "./seguimiento";
import { ficha } from "./test-utils";

// Los saludos dependen de la hora: las pruebas corren a las 10:00 (buenos días).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterEach(() => vi.useRealTimers());


// 2026-10-03 es sábado; 2026-10-04 domingo; 2026-10-05 lunes.
describe("seguimiento 1-2-3", () => {
  it("días hábiles: el domingo no cuenta", () => {
    expect(esDomingo("2026-10-04")).toBe(true);
    expect(siguienteHabil("2026-10-02")).toBe("2026-10-03");
    expect(siguienteHabil("2026-10-03")).toBe("2026-10-05");
  });

  it("van el día 1, el 3 y el 5 (contando de lunes a sábado)", () => {
    // 2026-10-01 es jueves
    let p = ficha("nuevo");
    expect(estadoSeguimiento(p, "2026-10-01")).toMatchObject({ siguiente: 0, hoy: true });
    p = registrarSeguimiento(p, "2026-10-01");
    expect(p.seguimiento).toEqual(["2026-10-01"]);
    // El 2 va el día 3: sábado 3 de octubre (el viernes aún no)
    expect(estadoSeguimiento(p, "2026-10-01")).toMatchObject({ siguiente: 1, hoy: false, desde: "2026-10-03", motivo: "Ya enviaste un mensaje hoy" });
    expect(registrarSeguimiento(p, "2026-10-01")).toBe(p);
    expect(estadoSeguimiento(p, "2026-10-02")).toMatchObject({ hoy: false, motivo: /día 1, el 3 y el 5/ });
    p = registrarSeguimiento(p, "2026-10-03");
    expect(p.seguimiento).toHaveLength(2);
    // El 3 va el día 5: el domingo no cuenta → martes 6
    expect(estadoSeguimiento(p, "2026-10-05")).toMatchObject({ hoy: false, desde: "2026-10-06" });
    expect(estadoSeguimiento(p, "2026-10-06").hoy).toBe(true);
  });

  it("el domingo no se envía", () => {
    expect(estadoSeguimiento(ficha("nuevo"), "2026-10-04")).toMatchObject({ hoy: false, desde: "2026-10-05", motivo: "Los domingos no se envía" });
    const p = registrarSeguimiento(ficha("nuevo"), "2026-10-01");
    expect(estadoSeguimiento(p, "2026-10-04")).toMatchObject({ hoy: false, motivo: "Los domingos no se envía" });
  });

  it("tras los 3 o si contestó, se detiene; si contestó, se puede empezar de nuevo con el 1", () => {
    let p = ficha("nuevo");
    for (const d of ["2026-10-01", "2026-10-03", "2026-10-06"]) p = registrarSeguimiento(p, d);
    expect(p.seguimiento).toHaveLength(3);
    expect(estadoSeguimiento(p, "2026-10-08")).toMatchObject({ siguiente: null, hoy: false });
    expect(deshacerSeguimiento(p, "2026-10-06").seguimiento).toEqual(["2026-10-01", "2026-10-03"]);
    const r = marcarRespondio(registrarSeguimiento(ficha("nuevo"), "2026-10-01"), "2026-10-02");
    expect(estadoSeguimiento(r, "2026-10-02")).toMatchObject({ siguiente: null, motivo: "Respondió" });
    const otra = reiniciarSeguimiento(r);
    expect(estadoSeguimiento(otra, "2026-10-02")).toMatchObject({ siguiente: 0, hoy: true });
    expect(otra.segVueltas).toEqual([{ enviados: ["2026-10-01"], respondio: "2026-10-02" }]);
    expect(vueltasDe(otra)).toBe(1);
  });

  it("la agenda avisa cuándo toca el siguiente mensaje", () => {
    const p = registrarSeguimiento(ficha("nuevo", { id: "a" }), "2026-10-03");
    expect(agenda([p], "2026-10-05").hoy).toEqual([]);
    const a = agenda([p], "2026-10-06");
    expect(a.hoy).toEqual([{ id: "a", motivo: "seguimiento", fecha: "2026-10-06", dias: 0, detalle: "Mensaje 2 de 3" }]);
  });
});

describe("configuración", () => {
  it("perfil: valores por defecto y los guardados", () => {
    expect(perfilDe(undefined)).toEqual({ nombreCompleto: "", apodo: "Bracho", rol: "asesor de inversiones", celular: "", correo: "", proposito: "" });
    const a = { ...ajustesIniciales(), perfil: { nombreCompleto: "Bradley H.", apodo: "Brad", rol: "asesor comercial" } };
    expect(perfilDe(a).apodo).toBe("Brad");
  });

  it("los mensajes usan tu nombre y tu rol", () => {
    const perfil = { nombreCompleto: "", apodo: "Brad", rol: "asesor comercial" };
    const ms = mensajesPara(ficha("nuevo", { nombre: "Ana" }), "2026-10-05", [], perfil);
    expect(ms[0].texto).toContain("Hola Ana, buenos días. Soy Brad, asesor comercial.");
    expect(textoPaso(0, { nombre: "Ana", referidor: "Luis", relacion: "Amigo" }, perfil)).toContain("Soy Brad, asesor comercial.");
  });

  it("mensajes guardados o iniciales; saludos con archivo solo si lo tienen", () => {
    const a = { ...ajustesIniciales(), mensajes: { seg1: { texto: "Hola {nombre} 👋" } } };
    expect(mensajeDe(a, "seg1").texto).toBe("Hola {nombre}"); // los emojis se quitan
    expect(mensajeDe(a, "seg2").texto).toContain("{nombre}");
    expect(saludoDisponible(a, "saludoTexto")).toBe(true);
    expect(saludoDisponible(a, "saludoVideo")).toBe(false);
    const conVideo = { ...a, mensajes: { saludoVideo: { texto: "x", adjunto: { nombre: "v.mp4", tipo: "video/mp4", bytes: 9 } } } };
    expect(saludoDisponible(conVideo, "saludoVideo")).toBe(true);
    expect(rellenar("Hola {nombre}, soy {asesor}", { nombre: "Ana", asesor: "Brad" })).toBe("Hola Ana, soy Brad");
  });

  it("adjuntos: tipo y máximo de 30 MB", () => {
    const MB = 1048576;
    expect(errorAdjunto({ type: "image/png", size: 10 }, "video", 30 * MB)).toBe("Elige un video");
    expect(errorAdjunto({ type: "video/mp4", size: 31 * MB }, "video", 30 * MB)).toMatch(/máximo es 30 MB/);
    expect(errorAdjunto({ type: "video/mp4", size: 29 * MB }, "video", 30 * MB)).toBe("");
    expect(errorAdjunto({ type: "application/pdf", size: 10 }, "cualquiera", 30 * MB)).toBe("");
  });
});

describe("saludo según la hora", () => {
  it("buenos días, buenas tardes o buenas noches, también en los mensajes guardados", async () => {
    const { ajustarSaludo, deseoHora, saludoMensaje } = await import("./inicio");
    expect([5, 11, 12, 18, 19, 23, 3].map((h) => saludoMensaje(h))).toEqual([
      "buenos días",
      "buenos días",
      "buenas tardes",
      "buenas tardes",
      "buenas noches",
      "buenas noches",
      "buenas noches",
    ]);
    expect(deseoHora(15)).toBe("una excelente tarde");
    expect(ajustarSaludo("Hola Ana, ¡buenos días! Buenas tardes a todos", 20)).toBe("Hola Ana, ¡buenas noches! Buenas noches a todos");
    vi.setSystemTime(new Date(2026, 9, 7, 16, 0));
    expect(rellenar("Hola {nombre}, ¡{saludo}! Que tengas {deseo}.", { nombre: "Ana" })).toBe("Hola Ana, ¡buenas tardes! Que tengas una excelente tarde.");
    expect(rellenar("Hola {nombre}, buenos días.", { nombre: "Ana" })).toBe("Hola Ana, buenas tardes.");
  });

  it("los mensajes guardados iguales a los de antes pasan a los nuevos con saludo; los editados se respetan", () => {
    const viejo = { ...ajustesIniciales(), mensajes: { saludoTexto: { texto: "Hola {nombre}, ¡buenos días! Te escribo para saludarte y desearte un excelente día. 😊" } } };
    expect(mensajeDe(viejo, "saludoTexto").texto).toBe("Hola {nombre}, ¡{saludo}! Le escribo para saludarle y desearle {deseo}.");
    const mio = { ...ajustesIniciales(), mensajes: { seg1: { texto: "Hola {nombre}, te escribo yo" } } };
    expect(mensajeDe(mio, "seg1").texto).toBe("Hola {nombre}, te escribo yo");
  });
});

describe("invitación sin reunión agendada", () => {
  it("pregunta qué día y a qué hora puede disponer de 30 minutos", async () => {
    const { textoInvitacion, mensajeDe, ajustesIniciales: ini } = await import("./ajustes");
    const plantilla = mensajeDe(ini(), "invitacion").texto;
    const v = { nombre: "Ana", asesor: "Bracho", rol: "asesor de inversiones", fecha: "", hora: "", lugar: "" };
    expect(textoInvitacion(plantilla, v, false)).toBe(
      "Hola Ana, buenos días. Soy Bracho, asesor de inversiones. Me gustaría invitarle a una reunión para conocer su situación y lo que es importante para usted. ¿Qué día y a qué hora podría disponer de 30 minutos para tener la reunión?",
    );
    const con = { ...v, fecha: "el viernes 9 de octubre", hora: "10:30", lugar: " en su oficina" };
    expect(textoInvitacion(plantilla, con, true)).toContain("para usted: el viernes 9 de octubre a las 10:30 en su oficina. ¿Le queda bien?");
    // Una invitación propia sin fecha: se le agrega la pregunta
    expect(textoInvitacion("Hola {nombre}, te invito a conversar", v, false)).toBe(
      "Hola Ana, te invito a conversar. ¿Qué día y a qué hora podría disponer de 30 minutos para tener la reunión?",
    );
  });
});
