import { fichaPct, fichaXp, insignias, misionesDe, misionStats, nivelDe, resumenTablero } from "./xp";
import { MISIONES } from "../config/ficha";
import { ficha, hist } from "./test-utils";

const mision = (id: string) => MISIONES.find((m) => m.id === id)!;

describe("misiones por tipo", () => {
  it("al inicio, nuevo y cambio tienen 2 secciones: datos y descubrimiento (sin presentación ni seguimiento)", () => {
    expect(misionesDe(ficha("nuevo")).map((m) => m.id)).toEqual(["datos", "desc"]);
    expect(misionesDe(ficha("cambio")).map((m) => m.id)).toEqual(["datos", "desc"]);
  });

});

describe("XP", () => {
  it("una ficha vacía tiene 0 XP", () => {
    expect(fichaXp(ficha("nuevo"))).toBe(0);
    expect(fichaXp(ficha("cambio"))).toBe(0);
  });

  it("suma el XP de cada campo lleno que aplica", () => {
    // nombre 10 + whatsapp 10 + edad 5
    expect(fichaXp(ficha("nuevo", { nombre: "Ana", whatsapp: "099", edad: "34" }))).toBe(25);
  });

  it("ignora los campos del otro tipo", () => {
    // institucion es solo de cambio
    expect(fichaXp(ficha("nuevo", { institucion: "X" }))).toBe(0);
    expect(fichaXp(ficha("cambio", { institucion: "X" }))).toBe(10);
  });

  it("los espacios en blanco no cuentan como lleno", () => {
    expect(fichaXp(ficha("nuevo", { nombre: "   " }))).toBe(0);
  });

  it("el historial da 10 XP por contacto, máximo 5", () => {
    expect(fichaXp(ficha("nuevo", { historial: hist(3) }))).toBe(30);
    expect(fichaXp(ficha("nuevo", { historial: hist(9) }))).toBe(50);
  });

  it("la etapa no suma XP, pero Cerrado da +100", () => {
    expect(fichaXp(ficha("nuevo", { etapa: "Presentado" }))).toBe(0);
    expect(fichaXp(ficha("nuevo", { etapa: "Cerrado" }))).toBe(100);
  });

  it("lo de + acciones (próximo contacto, notas) también suma", () => {
    expect(fichaXp(ficha("nuevo", { prox: "2026-10-09", notas: "x" }))).toBe(15);
  });

  it("los campos de un motivo no elegido no suman, y su dato se conserva", () => {
    const p = ficha("cambio", { cos_detalle: "2 % anual" });
    expect(fichaXp(p)).toBe(0);
    p.motivos = ["costos"];
    // motivos 10 + cos_detalle 5
    expect(fichaXp(p)).toBe(15);
    p.motivos = [];
    expect(fichaXp(p)).toBe(0);
    expect(p.cos_detalle).toBe("2 % anual");
  });
});

describe("avance", () => {
  it("es el promedio de las misiones que aplican", () => {
    const p = ficha("cambio", {
      nombre: "a",
      whatsapp: "b",
      edad: "40",
      origen: "Referido",
      depende: "hijos",
      ocupacion: "Docente",
    });
    // Referido: también cuentan quién lo refirió y la relación
    expect(misionStats(mision("datos"), p).pct).toBe(75);
    Object.assign(p, { referidor: "María", relacion: "Amiga" });
    expect(misionStats(mision("datos"), p).pct).toBe(100);
    // 100 de 2 secciones (la otra en 0) = 50
    expect(fichaPct(p)).toBe(50);
    expect(fichaPct({ ...p, tipo: "nuevo" })).toBe(50);
  });

  it("elegir un motivo agrega sus campos al total de la misión", () => {
    const desc = mision("desc");
    const sin = ficha("cambio", { motivos: ["otro"], otro_desc: "x" });
    const con = ficha("cambio", { motivos: ["otro", "liquidez"], otro_desc: "x" });
    expect(misionStats(desc, con).pct).toBeLessThan(misionStats(desc, sin).pct);
  });
});

describe("niveles", () => {
  it.each([
    [0, "Aprendiz"],
    [149, "Aprendiz"],
    [150, "Explorador"],
    [500, "Cazador"],
    [1200, "Estratega"],
    [2499, "Estratega"],
    [2500, "Leyenda"],
    [99999, "Leyenda"],
  ])("%i XP → %s", (xp, nombre) => {
    expect(nivelDe(xp).nombre).toBe(nombre);
  });

  it("calcula lo que falta para el siguiente nivel", () => {
    const n = nivelDe(300);
    expect(n.siguiente?.nombre).toBe("Cazador");
    expect(n.faltan).toBe(200);
    expect(n.pct).toBe(43);
    expect(nivelDe(3000).siguiente).toBeNull();
    expect(nivelDe(3000).pct).toBe(100);
  });
});

describe("insignias y tablero", () => {
  it("se desbloquean según las fichas", () => {
    const items = [
      ficha("nuevo", { id: "a", etapa: "Cerrado" }),
      ficha("cambio", { id: "b", historial: hist(5) }),
    ];
    const on = Object.fromEntries(insignias(items).map((b) => [b.id, b.on]));
    expect(on).toMatchObject({
      cierre1: true,
      cierreNuevo: true,
      cierreCambio: false,
      contactos: true,
      presentacion: false,
      escaneo: false,
      cartera: false,
    });
  });

  it("la insignia de reuniones pide las dos reuniones hechas", () => {
    const una = [{ n: 1, fecha: "2026-10-01" }];
    expect(insignias([ficha("nuevo", { reunionesHechas: una })]).find((b) => b.id === "presentacion")!.on).toBe(false);
    const dos = [...una, { n: 2, fecha: "2026-10-08" }];
    expect(insignias([ficha("nuevo", { reunionesHechas: dos })]).find((b) => b.id === "presentacion")!.on).toBe(true);
  });

  it("tasa de cierre = cierres / total", () => {
    const r = resumenTablero([
      ficha("nuevo", { id: "a", etapa: "Cerrado" }),
      ficha("nuevo", { id: "b" }),
      ficha("cambio", { id: "c" }),
    ]);
    expect(r.cierres).toBe(1);
    expect(r.tasa).toBe(33);
    expect(r.porTipo).toEqual({ nuevo: 2, cambio: 1 });
    expect(resumenTablero([]).tasa).toBe(0);
  });
});
