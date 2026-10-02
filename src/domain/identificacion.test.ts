import { cedulaValida, estadoIdentificacion } from "./identificacion";
import { editarPersona, setNumeroPersonas } from "./pre-ops";
import { personasDe } from "./pre";
import { ficha } from "./test-utils";
import type { Persona } from "./tipos";

const HOY = "2026-10-02";
const per = (x: Partial<Persona>): Persona => ({ id: "t", rol: "Titular", nombre: "Ana", edad: "40", sexo: "", ...x });

describe("identificación de asegurados", () => {
  it("cédula ecuatoriana con dígito verificador", () => {
    expect(cedulaValida("1710034065")).toBe(true);
    expect(cedulaValida("0923456784")).toBe(true);
    expect(cedulaValida("1710034066")).toBe(false);
    expect(cedulaValida("9910034065")).toBe(false); // provincia inexistente
    expect(cedulaValida("171003406")).toBe(false);
  });

  it("qué falta y avisos (cédula inválida, vencida, por vencer, fechas al revés); el pasaporte se acepta", () => {
    expect(estadoIdentificacion(per({}), HOY)).toMatchObject({ completo: false, falta: ["número", "fecha de emisión", "fecha de expiración"] });
    const ok = per({ ident: "1710034065", identEmision: "2020-05-10", identExpira: "2030-05-10" });
    expect(estadoIdentificacion(ok, HOY)).toEqual({ falta: [], avisos: [], completo: true });
    expect(estadoIdentificacion({ ...ok, ident: "AB123456" }, HOY).avisos).toEqual([]);
    expect(estadoIdentificacion({ ...ok, ident: "1710034066" }, HOY).avisos).toContain("La cédula no es válida: revisa los 10 dígitos");
    expect(estadoIdentificacion({ ...ok, identExpira: "2026-09-01" }, HOY).avisos).toContain(
      "El documento está vencido: pide que lo renueve antes de contratar",
    );
    expect(estadoIdentificacion({ ...ok, identExpira: "2026-10-12" }, HOY).avisos).toContain("El documento vence en 10 días");
    expect(estadoIdentificacion({ ...ok, identEmision: "2031-01-01" }, HOY).avisos).toContain("La expiración debe ser posterior a la emisión");
  });

  it("se guarda por cada asegurado (también el titular, que conserva su nombre de la ficha)", () => {
    let p = ficha("cambio", { nombre: "Luis Paz", edad: "45" });
    p = editarPersona(p, "t", "ident", "1710034065");
    p = setNumeroPersonas(p, 2);
    const hijo = personasDe(p)[1];
    p = editarPersona(p, hijo.id, "identExpira", "2031-01-01");
    const [t, h] = personasDe(p);
    expect(t).toMatchObject({ nombre: "Luis Paz", ident: "1710034065" });
    expect(h.identExpira).toBe("2031-01-01");
  });
});
