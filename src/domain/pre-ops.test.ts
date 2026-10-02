import { ZONAS } from "../config/zonas";
import {
  alternarZonaLimpia,
  detalleCondicion,
  editarPersona,
  marcarCondicion,
  otraZona,
  personaConDatos,
  quitarPersona,
  responderNo,
  responderSi,
  restoSinAntecedentes,
  setNumeroPersonas,
  setOtra,
  siguientePaso,
} from "./pre-ops";
import { estadoZona, personasDe, preStats, zonaDe } from "./pre";
import { ficha } from "./test-utils";

describe("personas", () => {
  it("sube y baja el número (1 a 10) y al bajar borra los datos de quien sale", () => {
    let p = setNumeroPersonas(ficha("nuevo"), 3);
    expect(personasDe(p)).toHaveLength(3);
    const tercero = personasDe(p)[2].id;
    p = responderNo(p, tercero)!;
    expect(personaConDatos(p, tercero)).toBe(true);
    p = setNumeroPersonas(p, 2);
    expect(personasDe(p)).toHaveLength(2);
    expect(p.preSN?.[tercero]).toBeUndefined();
    expect(personasDe(setNumeroPersonas(p, 99))).toHaveLength(10);
    expect(personasDe(setNumeroPersonas(p, 0))).toHaveLength(1);
  });

  it("no muta la ficha original", () => {
    const p0 = ficha("nuevo");
    setNumeroPersonas(p0, 4);
    expect(p0.personas).toBeUndefined();
  });

  it("el nombre y la edad del titular se escriben en la ficha; el sexo en su persona", () => {
    let p = editarPersona(ficha("nuevo"), "t", "edad", "44");
    p = editarPersona(p, "t", "sexo", "Mujer");
    expect(p.edad).toBe("44");
    expect(personasDe(p)[0]).toMatchObject({ edad: "44", sexo: "Mujer" });
  });

  it("quitar persona (nunca el titular)", () => {
    let p = setNumeroPersonas(ficha("nuevo"), 2);
    const h = personasDe(p)[1].id;
    expect(quitarPersona(p, "t")).toBe(p);
    p = quitarPersona(p, h);
    expect(personasDe(p)).toHaveLength(1);
  });
});

describe("declaración", () => {
  it('"No" se bloquea si ya hay condiciones', () => {
    const p = marcarCondicion(ficha("nuevo"), "t", "cabeza", "cab_migr", true);
    expect(responderNo(p, "t")).toBeNull();
    expect(responderNo(ficha("nuevo"), "t")?.preSN).toEqual({ t: "no" });
  });

  it("marcar una condición apaga 'sin antecedentes'; desmarcar borra el detalle", () => {
    let p = alternarZonaLimpia(responderSi(ficha("nuevo"), "t"), "t", "cabeza");
    expect(estadoZona(zonaDe(p, "t", "cabeza"))).toBe("clear");
    p = marcarCondicion(p, "t", "cabeza", "cab_migr", true);
    p = detalleCondicion(p, "t", "cabeza", "cab_migr", "a", "2018");
    expect(zonaDe(p, "t", "cabeza")).toMatchObject({ ok: false, it: { cab_migr: { a: "2018" } } });
    p = marcarCondicion(p, "t", "cabeza", "cab_migr", false);
    expect(estadoZona(zonaDe(p, "t", "cabeza"))).toBe("pend");
  });

  it("'otra' con texto apaga 'sin antecedentes'", () => {
    let p = alternarZonaLimpia(ficha("nuevo"), "t", "cuello");
    p = setOtra(p, "t", "cuello", "biopsia 2020");
    expect(estadoZona(zonaDe(p, "t", "cuello"))).toBe("hit");
  });

  it("una zona con condiciones no se puede marcar limpia", () => {
    const p = marcarCondicion(ficha("nuevo"), "t", "cabeza", "cab_migr", true);
    expect(alternarZonaLimpia(p, "t", "cabeza")).toBe(p);
  });

  it("'el resto sin antecedentes' completa el escaneo", () => {
    let p = marcarCondicion(ficha("nuevo"), "t", "corazon", "co_hta", true);
    p = restoSinAntecedentes(p, "t");
    expect(preStats(p)).toMatchObject({ pct: 100, completos: 1 });
  });
});

describe("navegación", () => {
  it("zona siguiente, anterior y siguiente pendiente", () => {
    const p = alternarZonaLimpia(ficha("nuevo"), "t", "ojos_orl");
    expect(otraZona(p, "t", "cabeza", 1)).toBe("ojos_orl");
    expect(otraZona(p, "t", "cabeza", 1, true)).toBe("cuello");
    expect(otraZona(p, "t", "cabeza", -1)).toBe(ZONAS.at(-1)!.id);
  });

  it("siguiente paso: persona sin responder, luego zonas, luego completa", () => {
    let p = setNumeroPersonas(ficha("nuevo"), 2);
    const h = personasDe(p)[1].id;
    p = responderNo(p, "t")!;
    expect(siguientePaso(p, "t")).toEqual({ tipo: "persona", pid: h });
    p = responderSi(p, h);
    expect(siguientePaso(p, "t")).toEqual({ tipo: "zonas", pid: h });
    p = restoSinAntecedentes(p, h);
    expect(siguientePaso(p, h)).toEqual({ tipo: "completa" });
  });
});
