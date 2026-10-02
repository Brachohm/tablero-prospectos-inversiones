import { calcularIMC, imcPersona, pesoKg, tallaMetros, textoIMC } from "./imc";
import { analisisLocal } from "./analisis";
import { editarPersona } from "./pre-ops";
import { preResumen, preTexto } from "./pre";
import { ficha, HOY } from "./test-utils";
import type { Persona } from "./tipos";

const per = (x: Partial<Persona>): Persona => ({ id: "t", rol: "Titular", nombre: "", edad: "40", sexo: "", ...x });

describe("IMC", () => {
  it("talla en m o cm y peso en kg o lb", () => {
    expect(tallaMetros("1,70", "m")).toBe(1.7);
    expect(tallaMetros("170", "cm")).toBe(1.7);
    expect(tallaMetros("170", "m")).toBe(1.7); // escribió cm con la unidad en m
    expect(tallaMetros("9", "m")).toBeNull();
    expect(pesoKg("70", "kg")).toBe(70);
    expect(pesoKg("154", "lb")).toBeCloseTo(69.85, 1);
    expect(calcularIMC(70, 1.7)).toBe(24.2);
  });

  it("rangos de la OMS y factor de riesgo solo si aplica", () => {
    expect(imcPersona(per({ talla: "1,70", peso: "70" }))).toMatchObject({ valor: 24.2, nivel: "adecuado", factor: null });
    const sp = imcPersona(per({ talla: "170", tallaU: "cm", peso: "185", pesoU: "lb" }))!;
    expect(sp).toMatchObject({ valor: 29, nivel: "sobrepeso", rango: "Sobrepeso" });
    expect(sp.factor).toMatch(/presión alta/);
    expect(imcPersona(per({ talla: "1,60", peso: "80" }))).toMatchObject({ valor: 31.3, nivel: "obesidad1" });
    expect(imcPersona(per({ talla: "1,75", peso: "52" }))!.nivel).toBe("bajo");
    expect(imcPersona(per({ talla: "1,60", peso: "110" }))!.nivel).toBe("obesidad3");
    // Menores: no se clasifica con estos rangos
    expect(imcPersona(per({ edad: "10", talla: "1,40", peso: "45" }))).toMatchObject({ nivel: null, factor: null });
    expect(imcPersona(per({ talla: "1,70" }))).toBeNull();
    expect(textoIMC(sp)).toBe("IMC 29 · Sobrepeso");
  });

  it("se guarda por persona (también el titular) y va al resumen, al CSV y al análisis", () => {
    let p = ficha("nuevo", { nombre: "Ana", edad: "45", etapa: "Pre-cierre" });
    p = editarPersona(p, "t", "talla", "160");
    p = editarPersona(p, "t", "tallaU", "cm");
    p = editarPersona(p, "t", "peso", "80");
    p = { ...p, preSN: { t: "no" } };
    expect(preResumen(p)[0]).toMatchObject({ imc: "IMC 31,3 · Obesidad grado I", imcFactor: true });
    expect(preTexto(p)).toBe("Ana (IMC 31,3 · Obesidad grado I): sin preexistencias");
    const a = analisisLocal(p, HOY);
    expect(a.recs.find((r) => r.id === "imc")?.d).toMatch(/Sin juzgar/);
  });
});
