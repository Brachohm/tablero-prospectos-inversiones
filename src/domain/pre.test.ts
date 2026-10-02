import { ZONAS } from "../config/zonas";
import {
  COND,
  estadoPersona,
  estadoZona,
  grupoVisible,
  personasDe,
  preResumen,
  preStats,
  preTexto,
  zonasPendientes,
} from "./pre";
import { insignias } from "./xp";
import { ficha } from "./test-utils";
import type { Declaracion } from "./tipos";

/** Declaración con todas las zonas limpias salvo las indicadas. */
function escaneo(hits: Record<string, string[]> = {}): Record<string, { ok?: boolean; it?: Record<string, object> }> {
  return Object.fromEntries(
    ZONAS.map((z) => [
      z.id,
      hits[z.id] ? { it: Object.fromEntries(hits[z.id].map((c) => [c, { a: "2020", e: "Controlado" }])) } : { ok: true },
    ]),
  );
}

describe("datos de zonas", () => {
  it("hay 16 zonas y los ids de condición son únicos", () => {
    expect(ZONAS).toHaveLength(16);
    const ids = ZONAS.flatMap((z) => z.grupos.flatMap((g) => g.condiciones.map((c) => c.id)));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(COND)).toHaveLength(ids.length);
  });
});

describe("estado de zona", () => {
  it("pend, clear y hit", () => {
    expect(estadoZona(undefined)).toBe("pend");
    expect(estadoZona({})).toBe("pend");
    expect(estadoZona({ ok: true })).toBe("clear");
    expect(estadoZona({ ok: true, it: { cab_migr: {} } })).toBe("hit");
    expect(estadoZona({ otra: "algo" })).toBe("hit");
    expect(estadoZona({ ok: true, otra: "   " })).toBe("clear");
  });
});

describe("personas", () => {
  it("el titular siempre es el primero y toma nombre y edad de la ficha", () => {
    const p = ficha("nuevo", {
      nombre: "Ana",
      edad: "41",
      personas: [
        { id: "x1", rol: "Hijo(a)", nombre: "", edad: "8", sexo: "" },
        { id: "t", rol: "Titular", nombre: "viejo", edad: "99", sexo: "Mujer" },
      ],
    });
    const per = personasDe(p);
    expect(per.map((x) => x.id)).toEqual(["t", "x1"]);
    expect(per[0]).toMatchObject({ nombre: "Ana", edad: "41", sexo: "Mujer" });
  });

  it("grupos por sexo: sin sexo se ven todos", () => {
    const g = { titulo: "Mujeres", sexo: "Mujer" as const, condiciones: [] };
    const base = { id: "t", rol: "Titular", nombre: "", edad: "" };
    expect(grupoVisible(g, { ...base, sexo: "" })).toBe(true);
    expect(grupoVisible(g, { ...base, sexo: "Mujer" })).toBe(true);
    expect(grupoVisible(g, { ...base, sexo: "Hombre" })).toBe(false);
  });

  it("estado de persona: pend, no, si", () => {
    expect(estadoPersona(ficha("nuevo"), "t")).toBe("pend");
    expect(estadoPersona(ficha("nuevo", { preSN: { t: "no" } }), "t")).toBe("no");
    expect(estadoPersona(ficha("nuevo", { preSN: { t: "si" } }), "t")).toBe("si");
    // "no" con condiciones declaradas se trata como "si"
    const pre: Declaracion = { t: { cabeza: { it: { cab_migr: {} } } } };
    expect(estadoPersona(ficha("nuevo", { preSN: { t: "no" }, pre }), "t")).toBe("si");
  });
});

describe("avance y XP de la declaración", () => {
  it("sin responder: 0% y 0 XP", () => {
    expect(preStats(ficha("nuevo"))).toMatchObject({ pct: 0, xp: 0, total: 16 });
  });

  it('"No, ninguna" cuenta como completa con 10 XP y sin bonus', () => {
    const s = preStats(ficha("nuevo", { preSN: { t: "no" } }));
    expect(s).toMatchObject({ pct: 100, xp: 10, completos: 0 });
  });

  it("escaneo completo: 4 XP por zona, 2 por condición y 30 de bonus", () => {
    const p = ficha("nuevo", { preSN: { t: "si" }, pre: { t: escaneo({ corazon: ["co_hta", "co_arr"] }) } });
    const s = preStats(p);
    expect(s.pct).toBe(100);
    expect(s.condiciones).toBe(2);
    expect(s.xp).toBe(16 * 4 + 2 * 2 + 30);
    expect(s.completos).toBe(1);
  });

  it("con dos personas, el avance es zonas revisadas / zonas totales", () => {
    const p = ficha("nuevo", {
      personas: [{ id: "h1", rol: "Hijo(a)", nombre: "", edad: "5", sexo: "" }],
      preSN: { t: "no", h1: "si" },
      pre: { h1: { cabeza: { ok: true }, pulmones: { ok: true } } },
    });
    // titular: 16 (No) + hijo: 2 = 18 de 32
    expect(preStats(p).pct).toBe(56);
    expect(zonasPendientes(p, "h1")).toBe(14);
  });

  it("la insignia de escaneo solo se gana con un escaneo real", () => {
    const soloNo = ficha("nuevo", { preSN: { t: "no" } });
    const real = ficha("nuevo", { pre: { t: escaneo() } });
    expect(insignias([soloNo]).find((b) => b.id === "escaneo")!.on).toBe(false);
    expect(insignias([real]).find((b) => b.id === "escaneo")!.on).toBe(true);
  });
});

describe("resumen", () => {
  it("lista condiciones con año y estado, y zonas pendientes", () => {
    const p = ficha("nuevo", {
      nombre: "Ana",
      pre: { t: { corazon: { it: { co_hta: { a: "2019", e: "Controlado" } }, otra: "soplo leve" }, cabeza: { ok: true } } },
    });
    const [r] = preResumen(p);
    expect(r.etiqueta).toBe("Ana");
    expect(r.persona).toBe("Titular");
    expect(r.con).toEqual([
      {
        zona: "Corazón y circulación",
        items: [
          { c: "Hipertensión arterial", a: "2019", e: "Controlado", t: "" },
          { c: "Otra: soplo leve", a: "", e: "", t: "" },
        ],
      },
    ]);
    expect(r.clear).toBe(1);
    expect(r.pend).toHaveLength(14);
    expect(preTexto(p)).toBe(
      "Ana: Corazón y circulación (Hipertensión arterial 2019, controlado; Otra: soplo leve)",
    );
  });

  it("preTexto vacío para fichas de cambio", () => {
    expect(preTexto(ficha("cambio", { pre: { t: escaneo({ cabeza: ["cab_migr"] }) } }))).toBe("");
  });
});
