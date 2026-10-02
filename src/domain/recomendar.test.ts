import { crearPlan, type Documento } from "./biblioteca";
import { catalogo, consejoModalidad, medicoDe, modalidadDe, necesidadesDe, recomendar, razones, revisarNecesidad } from "./recomendar";
import { ficha } from "./test-utils";

const doc = (id: string, plan: string, paginas: string[], extra: Partial<Documento> = {}): Documento => ({
  id,
  nombre: `Anexo ${plan}`,
  tipo: "anexo",
  plan,
  paginas,
  archivo: true,
  bytes: 1,
  creado: 1,
  mod: 1,
  ...extra,
});

const familia = doc("d1", "Plan Familia", [
  "COBERTURAS\nHospitalización y cirugía al 100%\nEmergencias 24/7 en la red\nPrima mensual: $95",
  "Maternidad: parto normal y cesárea cubiertos hasta $2.500\nCARENCIAS\nMaternidad: 10 meses",
]);
const basico = doc("d2", "Plan Básico", [
  "COBERTURAS\nHospitalización y cirugía al 80%\nPrima mensual: $60",
  "EXCLUSIONES\nNo cubre maternidad ni parto",
]);
const general = doc("d3", "", ["Condiciones generales: emergencias y maternidad"], { tipo: "condiciones", nombre: "Condiciones" });

describe("recomendar planes con los PDF", () => {
  it("arma el catálogo con los planes guardados y los que salen solos de los documentos", () => {
    const guardado = { ...crearPlan(1), id: "pl", nombre: "Plan Familia" };
    const c = catalogo([guardado], [familia, basico, general]);
    expect(c.map((x) => [x.plan.nombre, x.virtual])).toEqual([
      ["Plan Familia", false],
      ["Plan Básico", true],
    ]);
    // El guardado usa los PDF de su plan; el virtual se precarga del suyo (con su precio)
    expect(c[0].docs.map((d) => d.id)).toEqual(["d1"]);
    expect(c[1].plan.precio).toBe("$60");
  });

  it("lee las necesidades de la ficha", () => {
    const p = ficha("nuevo", { edad: "32", depende: "Esposa e hija", costoEvento: "Unos $8.000", ocupacion: "Chofer", cobertura: "IESS" });
    const ns = necesidadesDe(p);
    expect(ns[0]).toMatchObject({ id: "hospital", peso: 3, por: "Dijo: “Unos $8.000”" });
    expect(ns.map((n) => n.id)).toEqual(
      expect.arrayContaining(["emergencias", "medicinas", "accidentes", "maternidad", "ninos", "ambulatorio"]),
    );
    expect(necesidadesDe(ficha("nuevo", { edad: "60" })).map((n) => n.id)).toContain("cronicas");
  });

  it("recomienda el que respalda lo que necesita, citando el documento y la página", () => {
    const p = ficha("nuevo", { edad: "32", depende: "Esposa e hija", costoEvento: "Unos $8.000" });
    const [mejor, otro] = recomendar(p, [], [basico, familia]);
    expect(mejor.item.plan.nombre).toBe("Plan Familia");
    const mat = mejor.revision.find((r) => r.n.id === "maternidad")!;
    expect(mat.veredicto).toBe("cubre");
    expect(mat.avisos[0]).toEqual({ t: "Tiempo de espera: Maternidad: 10 meses", fuente: "Anexo Plan Familia, pág. 2" });
    const matB = otro.revision.find((r) => r.n.id === "maternidad")!;
    expect(matB.veredicto).toBe("falta");
    expect(matB.ev?.t).toMatch(/No cubre maternidad/);
    expect(mejor.ajuste).toBeGreaterThan(otro.ajuste);
    expect(razones(mejor)[0]).toMatch(/^Hospitalización y cirugía: /);
    // Lo que no aparece en ningún lado queda por confirmar (no se supone)
    expect(mejor.revision.find((r) => r.n.id === "medicinas")?.veredicto).toBe("?");
    // Sale del texto del PDF con su página
    const emer = mejor.revision.find((r) => r.n.id === "emergencias")!;
    expect(emer.ev?.fuente).toBe("Anexo Plan Familia, pág. 1");
  });

  it("el presupuesto manda: lo que lo supera va al final", () => {
    const p = ficha("nuevo", { edad: "32", depende: "Esposa e hija", pre_limite: "70" });
    const rs = recomendar(p, [], [familia, basico]);
    expect(rs.map((r) => [r.item.plan.nombre, r.fueraPresupuesto])).toEqual([
      ["Plan Básico", false],
      ["Plan Familia", true],
    ]);
  });

  it("busca sus condiciones declaradas en el texto del plan", () => {
    const d = doc("d4", "Plan Salud", ["Preexistencias: diabetes cubierta desde el mes 24"]);
    const [item] = catalogo([], [d]);
    const r = revisarNecesidad(item, { id: "preexistencias", l: "Preexistencias", peso: 3, por: "", extra: ["diabetes"] });
    expect(r.veredicto).toBe("cubre");
    expect(r.ev).toEqual({ t: "Preexistencias: diabetes cubierta desde el mes 24", fuente: "Anexo Plan Salud, pág. 1" });
  });

  it("sin documentos ni planes no recomienda nada", () => {
    expect(recomendar(ficha("nuevo"), [], [])).toEqual([]);
  });

  describe("médico de cabecera", () => {
    const abierta = doc("d5", "Plan Total", ["Plan de modalidad abierta\nHospitalización y cirugía al 100%\nPrima mensual: $90"]);
    const star = doc("d6", "Plan Star", ["Atención solo en la red de convenio\nHospitalización y cirugía al 100%\nPrima mensual: $70"]);
    const mixta = { ...crearPlan(1), id: "mx", nombre: "Plan Uno", modalidad: "Mixta", precio: "$80" };

    it("reconoce la modalidad según el producto: la escrita o la de sus PDF", () => {
      const c = catalogo([mixta], [abierta, star]);
      expect(c.map((x) => modalidadDe(x)?.m)).toEqual(["mixta", "abierta", "cerrada"]);
      expect(modalidadDe(c[1])?.fuente).toBe("Anexo Plan Total, pág. 1");
      expect(modalidadDe(c[2])?.fuente).toBe("Anexo Plan Star, pág. 1");
      // No se deduce por el nombre: un plan sin modalidad escrita queda por confirmar
      expect(modalidadDe(catalogo([], [doc("d8", "Plan Star Uno", ["Hospitalización 100%"])])[0])).toBeNull();
      expect(modalidadDe(catalogo([], [familia])[0])).toBeNull();
    });

    it("sin médico de cabecera no cambia nada", () => {
      expect(medicoDe(ficha("nuevo")).tiene).toBe(false);
      expect(consejoModalidad(medicoDe(ficha("nuevo")))).toBe("");
      expect(necesidadesDe(ficha("nuevo")).some((n) => n.id === "medico")).toBe(false);
    });

    it("con médico: Abierta o Mixta primero; la red cerrada al final", () => {
      const p = ficha("nuevo", { medicoCabecera: "Sí", medicoNombre: "Dra. Paredes", redConvenio: "No" });
      expect(consejoModalidad(medicoDe(p))).toMatch(/Abierta o Mixta/);
      const n = necesidadesDe(p).find((x) => x.id === "medico")!;
      expect(n).toMatchObject({ peso: 3, por: "Su médico de cabecera: Dra. Paredes", extra: ["paredes"] });
      const rs = recomendar(p, [mixta], [abierta, star]);
      // El de red cerrada es el más barato y cubre igual, pero no respeta a su médico
      expect(rs.map((r) => [r.item.plan.nombre, r.noApta])).toEqual([
        ["Plan Total", false],
        ["Plan Uno", false],
        ["Plan Star", true],
      ]);
      const med = rs[2].revision.find((r) => r.n.id === "medico")!;
      expect(med.veredicto).toBe("falta");
      expect(med.ev?.t).toMatch(/^Red cerrada: /);
    });

    it("si su médico aparece en los PDF del plan, ese plan sí sirve", () => {
      const conRed = doc("d7", "Plan Star Red", ["Red de convenio\nDra. Ana Paredes - Medicina general"]);
      const p = ficha("nuevo", { medicoCabecera: "Sí", medicoNombre: "Dra. Ana Paredes", redConvenio: "No" });
      const [r] = recomendar(p, [], [conRed]);
      expect(r.noApta).toBe(false);
      expect(r.revision.find((x) => x.n.id === "medico")?.ev).toEqual({
        t: "Su médico aparece en el plan: Dra. Ana Paredes - Medicina general",
        fuente: "Anexo Plan Star Red, pág. 1",
      });
    });

    it("si no tiene problema con la red de convenio, también entra la red cerrada", () => {
      const p = ficha("nuevo", { medicoCabecera: "Sí", redConvenio: "Sí" });
      expect(consejoModalidad(medicoDe(p))).toMatch(/también de red cerrada\.$/);
      const rs = recomendar(p, [], [abierta, star]);
      expect(rs.every((r) => !r.noApta)).toBe(true);
      expect(necesidadesDe(p).some((n) => n.id === "medico")).toBe(false);
    });
  });
});
