import { perfilDe } from "./ajustes";
import { enlaceCalendar, errorReunion, linkDe, lugarFrase, lugarTexto, modoDe } from "./reunion";

const perfil = { ...perfilDe(undefined), nombreCompleto: "Bradley Hidalgo", celular: "0991234567" };

describe("modalidad de la reunión", () => {
  it("presencial con lugar; Zoom o Meet con su link; las de antes se reconocen", () => {
    expect(modoDe({})).toBe("presencial");
    expect(lugarFrase({ reunionLugar: "su oficina" })).toBe(" en su oficina");
    const z = { reunionModo: "zoom", reunionLink: "https://zoom.us/j/123" };
    expect(lugarTexto(z)).toBe("Zoom: https://zoom.us/j/123");
    expect(lugarFrase(z)).toBe(" por Zoom: https://zoom.us/j/123");
    expect(lugarFrase({ reunionModo: "meet" })).toBe(" por Google Meet");
    expect(modoDe({ reunionLugar: "https://meet.google.com/abc" })).toBe("meet");
    expect(linkDe({ reunionLugar: "https://meet.google.com/abc" })).toBe("https://meet.google.com/abc");
    expect(errorReunion("", "presencial", "")).toBe("Elige la fecha y hora");
    expect(errorReunion("2026-10-09T10:30", "zoom", "zoom.us/j/1")).toBe("El link debe empezar con https://");
    expect(errorReunion("2026-10-09T10:30", "zoom", "")).toBe("");
  });
});

describe("Google Calendar", () => {
  it("evento con fecha, hora (1 hora), link, lugar e invitado", () => {
    const u = new URL(
      enlaceCalendar(
        { nombre: "Ana Torres", correo: "ana@correo.com", reunion: "2026-10-09T10:30", reunionModo: "zoom", reunionLink: "https://zoom.us/j/123" },
        perfil,
      )!,
    );
    expect(u.origin + u.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(u.searchParams.get("action")).toBe("TEMPLATE");
    expect(u.searchParams.get("text")).toBe("Reunión de asesoría con Ana Torres");
    expect(u.searchParams.get("dates")).toBe("20261009T103000/20261009T113000");
    expect(u.searchParams.get("ctz")).toBe("America/Guayaquil");
    expect(u.searchParams.get("location")).toBe("https://zoom.us/j/123");
    expect(u.searchParams.get("details")).toContain("Zoom: https://zoom.us/j/123");
    expect(u.searchParams.get("add")).toBe("ana@correo.com");
  });

  it("presencial sin correo; sin hora es de todo el día; sin fecha, nada", () => {
    const u = new URL(enlaceCalendar({ reunion: "2026-10-31T23:30", reunionLugar: "su oficina" }, perfil)!);
    expect(u.searchParams.get("dates")).toBe("20261031T233000/20261101T003000");
    expect(u.searchParams.get("location")).toBe("su oficina");
    expect(u.searchParams.has("add")).toBe(false);
    expect(new URL(enlaceCalendar({ reunion: "2026-10-09" }, perfil)!).searchParams.get("dates")).toBe("20261009/20261010");
    expect(enlaceCalendar({}, perfil)).toBeNull();
  });
});

describe("dos recordatorios por reunión", () => {
  const t = (h: number, m = 0) => new Date(2026, 9, 7, h, m).getTime();
  const d = { nombre: "Ana", reunion: "2026-10-07T10:30", reunionModo: "zoom", reunionLink: "https://zoom.us/j/1" };

  it("el 2 se habilita con máximo una hora de anticipación y hasta que empieza", async () => {
    const { estadoRecordatorios } = await import("./reunion");
    expect(estadoRecordatorios(d, t(9, 0))).toMatchObject({ r1: null, r2: null, tocaR2: false, minutos: 90, desdeR2: t(9, 30) });
    expect(estadoRecordatorios(d, t(9, 30)).tocaR2).toBe(true);
    expect(estadoRecordatorios(d, t(10, 15))).toMatchObject({ tocaR2: true, minutos: 15 });
    expect(estadoRecordatorios(d, t(10, 31)).tocaR2).toBe(false);
    // Sin hora no hay recordatorio 2
    expect(estadoRecordatorios({ reunion: "2026-10-07" }, t(9))).toMatchObject({ desdeR2: null, tocaR2: false });
  });

  it("se marcan por reunión: si la reunión cambia, empiezan de cero", async () => {
    const { estadoRecordatorios, marcarRecordatorio } = await import("./reunion");
    const con1 = { ...d, ...marcarRecordatorio(d, 1, t(8)) };
    expect(estadoRecordatorios(con1, t(9, 45))).toMatchObject({ r1: t(8), r2: null, tocaR2: true });
    const con2 = { ...con1, ...marcarRecordatorio(con1, 2, t(9, 50)) };
    expect(estadoRecordatorios(con2, t(9, 55))).toMatchObject({ r1: t(8), r2: t(9, 50), tocaR2: false });
    expect(estadoRecordatorios({ ...con2, reunion: "2026-10-14T10:30" }, t(9))).toMatchObject({ r1: null, r2: null });
  });

  it("texto del recordatorio 2 con la hora y el link", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(t(9, 45));
    const { textoRecordatorio2 } = await import("./mensajes");
    const { ficha } = await import("./test-utils");
    expect(textoRecordatorio2(ficha("nuevo", d), "2026-10-07")).toBe(
      "Hola Ana, buenos días. Le recuerdo que en un momento, a las 10:30, nos vemos por Zoom: https://zoom.us/j/1. Será un gusto atenderle.",
    );
    expect(textoRecordatorio2(ficha("nuevo", { reunion: "2026-10-07" }), "2026-10-07")).toBeNull();
    vi.useRealTimers();
  });
});
