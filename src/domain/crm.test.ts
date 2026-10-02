import {
  agenda,
  registrarContactoRapido,
  VENTANA_REPETIDO_MS,
  borrarContacto,
  clientes,
  diasSinContacto,
  posventaHecha,
  prospectosAbiertos,
  referidosDe,
  registrarContacto,
  renovacionCliente,
  ultimoContacto,
} from "./crm";
import { exportarCSV } from "./csv";
import { fichaXp } from "./xp";
import { ficha, HOY } from "./test-utils";

describe("historial de contactos", () => {
  it("registra en orden de fecha, sin mutar la ficha original", () => {
    const p0 = ficha("nuevo");
    const p1 = registrarContacto(p0, { fecha: "2026-09-20", canal: "Llamada", nota: " le interesa " }, 100);
    const p2 = registrarContacto(p1, { fecha: "2026-09-10", canal: "WhatsApp" }, 200);
    expect(p0.historial).toBeUndefined();
    expect(p2.historial!.map((c) => c.fecha)).toEqual(["2026-09-10", "2026-09-20"]);
    expect(p2.historial![1].nota).toBe("le interesa");
    expect(p2.mod).toBe(200);
    expect(ultimoContacto(p2)!.canal).toBe("Llamada");
    expect(diasSinContacto(p2, HOY)).toBe(10);
    expect(diasSinContacto(p0, HOY)).toBeNull();
  });

  it("cada contacto suma XP hasta 5 y se puede borrar", () => {
    let p = ficha("nuevo");
    for (let i = 1; i <= 6; i++) p = registrarContacto(p, { fecha: `2026-09-0${i}`, canal: "WhatsApp" }, i);
    expect(fichaXp(p)).toBe(50);
    p = borrarContacto(p, p.historial![0].id, 99);
    expect(p.historial).toHaveLength(5);
  });
});

describe("cartera", () => {
  const items = [
    ficha("nuevo", { id: "cli", etapa: "Cerrado", nombre: "Marta" }),
    ficha("nuevo", { id: "ref", referidoPor: "cli" }),
    ficha("cambio", { id: "per", etapa: "Perdido" }),
  ];

  it("separa clientes y prospectos abiertos", () => {
    expect(clientes(items).map((p) => p.id)).toEqual(["cli"]);
    expect(prospectosAbiertos(items).map((p) => p.id)).toEqual(["ref"]);
  });

  it("referidos del cliente", () => {
    expect(referidosDe(items, "cli").map((p) => p.id)).toEqual(["ref"]);
  });

  it("renovación: la escrita, o el siguiente aniversario del inicio", () => {
    expect(renovacionCliente(ficha("nuevo", { cli_renovacion: "2027-01-15" }), HOY)).toEqual({
      fecha: "2027-01-15",
      estimada: false,
    });
    expect(renovacionCliente(ficha("nuevo", { cli_afiliacion: "2026-03-10" }), HOY)).toEqual({
      fecha: "2027-03-10",
      estimada: true,
    });
    expect(renovacionCliente(ficha("nuevo", { cli_afiliacion: "2023-10-05" }), HOY)!.fecha).toBe("2026-10-05");
    expect(renovacionCliente(ficha("nuevo", { cli_afiliacion: "2024-02-29" }), HOY)!.fecha).toBe("2027-02-28");
    expect(renovacionCliente(ficha("nuevo"), HOY)).toBeNull();
  });

  it("posventa", () => {
    expect(posventaHecha(ficha("nuevo", { pv_bienvenida: true, pv_referidos: true }))).toEqual({ hechos: 2, total: 5 });
  });

  it("el CSV incluye historial, referido y datos de cliente", () => {
    const csv = exportarCSV([
      ...items,
      registrarContacto(ficha("nuevo", { id: "x" }), { fecha: "2026-09-01", canal: "Reunión", nota: "café" }, 1),
    ]);
    expect(csv).toContain("2026-09-01 Reunión: café");
    expect(csv).toContain("Marta");
    expect(csv).toContain("Fecha de emisión");
  });
});

describe("agenda", () => {
  const items = [
    ficha("nuevo", { id: "venc", prox: "2026-09-28", proxTxt: "mandar caso" }),
    ficha("nuevo", { id: "hoy", prox: HOY }),
    ficha("cambio", { id: "sem", prox: "2026-10-04", renovacion: "2026-10-20" }),
    ficha("nuevo", { id: "lejos", prox: "2026-12-01" }),
    ficha("nuevo", { id: "perdido", etapa: "Perdido", prox: "2026-09-29" }),
    ficha("nuevo", { id: "cli", etapa: "Cerrado", cli_afiliacion: "2025-10-03", prox: "2026-10-01" }),
  ];
  const a = agenda(items, HOY);

  it("agrupa en vencidos, hoy y esta semana, sin perdidos", () => {
    expect(a.vencidos.map((x) => x.id)).toEqual(["venc"]);
    expect(a.vencidos[0].detalle).toBe("mandar caso");
    expect(a.hoy.map((x) => x.id)).toEqual(["hoy"]);
    expect(a.semana.map((x) => [x.id, x.motivo])).toEqual([
      ["cli", "posventa"],
      ["cli", "renovacion"],
      ["sem", "contacto"],
    ]);
  });

  it("muestra renovaciones próximas (cliente y póliza actual de quien quiere cambiarse)", () => {
    expect(a.proximas.map((x) => [x.id, x.motivo, x.dias])).toEqual([["sem", "renovacionActual", 20]]);
    const ren = a.semana.find((x) => x.motivo === "renovacion")!;
    expect(ren).toMatchObject({ fecha: "2026-10-03", estimada: true });
  });

  it("una renovación escrita que ya pasó aparece como vencida", () => {
    const b = agenda([ficha("nuevo", { id: "c", etapa: "Cerrado", cli_renovacion: "2026-09-01" })], HOY);
    expect(b.vencidos.map((x) => x.motivo)).toEqual(["renovacion"]);
  });
});

describe("registro automático al llamar o escribir", () => {
  it("agrega un contacto de hoy con el canal", () => {
    const { ficha: p, nuevo } = registrarContactoRapido(ficha("nuevo"), "Llamada", HOY, 1000);
    expect(nuevo).toMatchObject({ fecha: HOY, canal: "Llamada", nota: "" });
    expect(p.historial).toHaveLength(1);
  });

  it("tocar otra vez el mismo botón al rato no duplica; pasado el rato sí cuenta", () => {
    const a = registrarContactoRapido(ficha("nuevo"), "Llamada", HOY, 1000).ficha;
    const b = registrarContactoRapido(a, "Llamada", HOY, 1000 + 60_000);
    expect(b.nuevo).toBeNull();
    expect(b.ficha).toBe(a);
    const c = registrarContactoRapido(a, "Llamada", HOY, 1000 + VENTANA_REPETIDO_MS + 1);
    expect(c.ficha.historial).toHaveLength(2);
  });

  it("llamar con saldo, llamar por WhatsApp y escribir son contactos distintos", () => {
    const a = registrarContactoRapido(ficha("nuevo"), "Llamada", HOY, 1000).ficha;
    const b = registrarContactoRapido(a, "WhatsApp", HOY, 2000, "Llamada por WhatsApp").ficha;
    const c = registrarContactoRapido(b, "WhatsApp", HOY, 3000);
    expect(c.ficha.historial?.map((x) => [x.canal, x.nota])).toEqual([
      ["Llamada", ""],
      ["WhatsApp", "Llamada por WhatsApp"],
      ["WhatsApp", ""],
    ]);
  });
});
