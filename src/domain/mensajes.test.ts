import { agenda } from "./crm";
import { enlaceSMS, fechaLarga, mensajesPara, recordatorioReunion, rellenar, reunionDe } from "./mensajes";
import { ficha, hist } from "./test-utils";

// Los saludos dependen de la hora: las pruebas corren a las 10:00 (buenos días).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterEach(() => vi.useRealTimers());


const HOY = "2026-10-08"; // jueves

describe("mensajes de seguimiento", () => {
  it("fecha larga en español", () => {
    expect(fechaLarga("2026-10-09")).toBe("el viernes 9 de octubre");
  });

  it("reunión: hoy, mañana o fecha, con hora y lugar", () => {
    expect(reunionDe(ficha("nuevo", { reunion: "2026-10-09T10:30", reunionLugar: "su oficina" }), HOY)).toEqual({
      fecha: "2026-10-09",
      hora: "10:30",
      lugar: "su oficina",
      dias: 1,
      cuando: "mañana",
    });
    expect(reunionDe(ficha("nuevo", { reunion: "2026-10-08T09:00" }), HOY)?.cuando).toBe("hoy");
    expect(reunionDe(ficha("nuevo", { reunion: "2026-10-15T09:00" }), HOY)?.cuando).toBe("el jueves 15 de octubre");
    expect(reunionDe(ficha("nuevo"), HOY)).toBeNull();
  });

  it("rellenar deja vacío lo que falta, sin espacios dobles", () => {
    expect(rellenar("Hola {nombre}, la propuesta{plan}{precio}.", { nombre: "", plan: "", precio: "" })).toBe(
      "Hola, la propuesta.",
    );
  });

  it("según la etapa: nuevo, referido y objeción específica", () => {
    const ids = (p: Parameters<typeof mensajesPara>[0], items = [] as Parameters<typeof mensajesPara>[2]) =>
      mensajesPara(p, HOY, items).map((m) => m.id);
    expect(ids(ficha("nuevo", { nombre: "Ana Torres" }))).toEqual(["n-primero"]);
    // Tras el primer contacto: cuadrar la cita
    expect(ids(ficha("nuevo", { historial: hist(1) }))).toEqual(["n-agendar", "c-opciones"]);
    const ref = ficha("nuevo", { id: "r", nombre: "Luis Paz" });
    const p = ficha("nuevo", { nombre: "Ana", referidoPor: "r" });
    expect(ids(p, [ref])).toEqual(["n-referido"]);
    expect(mensajesPara(p, HOY, [ref])[0].texto).toContain("Luis me compartió su contacto");
    // "Objeción" de versiones anteriores ahora es Seguimiento: la objeción específica reemplaza a la general.
    const obj = ids(ficha("nuevo", { etapa: "Objeción", objecion: "No tengo dinero ahora" }));
    expect(obj).toContain("o-precio");
    expect(obj).not.toContain("o-general");
    expect(ids(ficha("nuevo", { etapa: "Seguimiento" }))).toContain("o-general");
    // Primera reunión: preparar sin hablar de productos; segunda: agradecer y preparar la propuesta.
    expect(ids(ficha("nuevo", { etapa: "Primera reunión" }))).toEqual(["m1-preparar"]);
    expect(ids(ficha("nuevo", { reunionesHechas: [{ n: 1, fecha: "2026-10-01" }] }))).toEqual(["d-gracias2", "d-dato"]);
  });

  it("seguimiento: aporte de valor y no insistir tras varios contactos", () => {
    const p = ficha("nuevo", { etapa: "Seguimiento", proxTxt: "un caso real de reembolso", historial: hist(3) });
    const ms = mensajesPara(p, HOY);
    expect(ms.map((m) => m.id).filter((x) => x.startsWith("s-"))).toEqual(["s-aporte", "s-retomar", "s-ultimo"]);
    expect(ms.find((m) => m.id === "s-aporte")!.texto).toContain("un caso real de reembolso");
  });

  it("después de la propuesta: su porqué, plan y precio", () => {
    const p = ficha("nuevo", { etapa: "Seguimiento", nombre: "Ana", porque: "Nació su hija.", plan: "Familiar", precio: "95" });
    const r = mensajesPara(p, HOY).find((m) => m.id === "p-resumen")!;
    expect(r.texto).toContain("lo que más le importaba era Nació su hija, y la propuesta (plan Familiar) por $95 al mes");
  });

  it("recordatorios de reunión primero; el mismo día cambia a 'hoy'", () => {
    const p = ficha("nuevo", { nombre: "Ana", etapa: "Descubrimiento", reunion: "2026-10-09T10:30", reunionLugar: "Zoom" });
    const ms = mensajesPara(p, HOY);
    expect(ms.slice(0, 2).map((m) => m.id)).toEqual(["r-confirmar", "r-mover"]);
    expect(ms[0].texto).toBe("Hola Ana, buenos días. Soy Bracho. Le escribo para confirmar nuestra reunión mañana a las 10:30 por Zoom. ¿Le sigue quedando bien?");
    expect(recordatorioReunion({ ...p, reunion: "2026-10-08T16:00" }, HOY)).toBe(
      "Hola Ana, buenos días. Le recuerdo que hoy nos vemos a las 16:00 por Zoom. Quedo atento.",
    );
    // Reunión pasada: no hay recordatorio
    expect(recordatorioReunion({ ...p, reunion: "2026-10-01T10:00" }, HOY)).toBeNull();
    // Reunión virtual con su link; presencial con el lugar
    expect(recordatorioReunion({ ...p, reunionModo: "meet", reunionLink: "https://meet.google.com/abc" }, HOY)).toContain(
      "10:30 por Google Meet: https://meet.google.com/abc",
    );
    expect(recordatorioReunion({ ...p, reunionModo: "presencial", reunionLugar: "su oficina" }, HOY)).toContain("10:30 en su oficina");
  });

  it("enlace SMS con el texto", () => {
    expect(enlaceSMS(ficha("nuevo", { whatsapp: "099 123 4567" }), "Hola Ana")).toBe("sms:0991234567?body=Hola%20Ana");
    expect(enlaceSMS(ficha("nuevo"), "x")).toBeNull();
  });

  it("la agenda muestra las reuniones de hoy en adelante", () => {
    const a = agenda(
      [
        ficha("nuevo", { id: "a", reunion: "2026-10-08T15:00", reunionLugar: "Oficina" }),
        ficha("nuevo", { id: "b", reunion: "2026-10-05T15:00" }),
      ],
      HOY,
    );
    expect(a.hoy).toEqual([{ id: "a", motivo: "reunion", fecha: "2026-10-08", dias: 0, detalle: "15:00 · Oficina" }]);
    expect(a.vencidos).toEqual([]);
  });
});
