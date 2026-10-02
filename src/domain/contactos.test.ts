import {
  crearContacto,
  datosParaFicha,
  desmarcarSaludo,
  errorContacto,
  marcarSaludo,
  porSaludar,
} from "./contactos";
import { telefonoDe, whatsAppDe } from "./ficha";

const c = (datos: Parameters<typeof crearContacto>[0], ahora = 1) => crearContacto(datos, ahora);

describe("contactos nuevos", () => {
  it("valida lo mínimo", () => {
    expect(errorContacto(c({}))).toBe("Escribe el nombre");
    expect(errorContacto(c({ nombre: "Ana" }))).toBe("Pon al menos el celular o el correo");
    expect(errorContacto(c({ nombre: "Ana", celular: "0991" }))).toBe("Revisa el celular");
    expect(errorContacto(c({ nombre: "Ana", correo: "ana@" }))).toBe("Revisa el correo");
    expect(errorContacto(c({ nombre: "Ana", edad: "abc", celular: "0991234567" }))).toMatch(/edad/);
    expect(errorContacto(c({ nombre: "Ana López", edad: "34", celular: "099 123 4567", correo: "ana@mail.com" }))).toBe("");
  });

  it("por saludar: cada día de nuevo, primero los de saludo más antiguo; no los pasados a prospecto", () => {
    const a = { ...c({ nombre: "A" }, 1), ultimoSaludo: "2026-10-01" };
    const b = { ...c({ nombre: "B" }, 2), ultimoSaludo: "2026-10-02" };
    const nuevo = c({ nombre: "N" }, 3);
    const pasado = { ...c({ nombre: "P" }, 4), fichaId: "f1" };
    expect(porSaludar([b, a, nuevo, pasado], "2026-10-02").map((x) => x.nombre)).toEqual(["N", "A"]);
    expect(porSaludar([b], "2026-10-03").map((x) => x.nombre)).toEqual(["B"]);
  });

  it("marcar y deshacer el saludo", () => {
    const x = c({ nombre: "A" });
    const m = marcarSaludo(x, "2026-10-02");
    expect(m).toMatchObject({ ultimoSaludo: "2026-10-02", saludos: 1 });
    expect(marcarSaludo(m, "2026-10-02")).toBe(m);
    expect(desmarcarSaludo(m, undefined)).toMatchObject({ ultimoSaludo: undefined, saludos: 0 });
  });


  it("números desde texto", () => {
    expect(whatsAppDe("099 123 4567")).toBe("593991234567");
    expect(telefonoDe("(099) 123-4567")).toBe("0991234567");
  });

  it("datos para la ficha: nombre, edad, whatsapp, correo y sexo del titular", () => {
    const x = c({ nombre: "Ana ", edad: "34", genero: "Femenino", celular: "0991234567", correo: "a@b.co" });
    expect(datosParaFicha(x)).toEqual({
      nombre: "Ana",
      edad: "34",
      whatsapp: "0991234567",
      correo: "a@b.co",
      personas: [{ id: "t", rol: "Titular", nombre: "", edad: "", sexo: "Mujer" }],
      contactoId: x.id,
    });
    expect(datosParaFicha(c({ nombre: "Sam", genero: "Otro" }))).not.toHaveProperty("personas");
  });
});

describe("saludo para quien no tiene tu número registrado", () => {
  it("agrega la presentación después de la primera frase (y no la repite si ya te nombra)", async () => {
    const { conPresentacion } = await import("./ajustes");
    const p = "Le saluda Bracho, asesor de inversiones. Le escribo para presentarme y quedar a sus órdenes.";
    expect(conPresentacion("Hola Ana, ¡buenos días! Le escribo para saludarle y desearle un excelente día.", p, "Bracho")).toBe(
      "Hola Ana, ¡buenos días! Le saluda Bracho, asesor de inversiones. Le escribo para presentarme y quedar a sus órdenes. Le escribo para saludarle y desearle un excelente día.",
    );
    expect(conPresentacion("Hola Ana", p, "Bracho")).toBe(`Hola Ana ${p}`);
    expect(conPresentacion("Hola Ana, soy Bracho. ¿Cómo está?", p, "Bracho")).toBe("Hola Ana, soy Bracho. ¿Cómo está?");
    expect(conPresentacion("Hola Ana.", "", "Bracho")).toBe("Hola Ana.");
  });
});
