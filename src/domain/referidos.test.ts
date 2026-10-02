import { crearContacto, datosParaFicha, enCadena, errorContacto, porSaludar } from "./contactos";
import { campoActivo, CAMPO } from "./ficha";
import { cadenaCompleta, fraseRelacion, marcarPaso, pasosCadena, siguientePaso, textoPaso } from "./referidos";
import { ficha } from "./test-utils";

// Los saludos dependen de la hora: las pruebas corren a las 10:00 (buenos días).
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 7, 10, 0));
});
afterEach(() => vi.useRealTimers());


const d = { nombre: "Carla Mena", referidor: "María José Vera", relacion: "Amiga" };

describe("cadena de referido", () => {
  it("mensaje 1: se presenta, menciona a quien lo refirió y confirma que sea la persona", () => {
    expect(textoPaso(0, d)).toBe(
      "¡Hola, buenos días! ¿Tengo el gusto de hablar con Carla? Soy Bracho, asesor de inversiones. María, su amiga, me compartió su contacto y me pidió que le escribiera. ¿Es usted?",
    );
    expect(fraseRelacion("Cliente mío")).toBe("");
    expect(textoPaso(0, { ...d, relacion: "Otro" })).toContain("María me compartió su contacto");
  });

  it("mensaje 2: asesoría de regalo, sin vender, y pide día y hora", () => {
    const t = textoPaso(1, d);
    expect(t).toContain("con María hemos estado trabajando en opciones para optimizar sus finanzas y proteger su patrimonio");
    expect(t).toContain("quiso regalarle una asesoría");
    expect(t).toContain("No es para venderle nada");
    expect(t).toMatch(/¿Qué día y a qué hora tendría disponibilidad\?$/);
  });

  it("los pasos se activan en orden y se guarda el día", () => {
    expect(pasosCadena(d).map((p) => [p.disponible, p.enviado])).toEqual([
      [true, null],
      [false, null],
      [false, null],
    ]);
    expect(siguientePaso(d)?.n).toBe(1);
    const c1 = marcarPaso(undefined, 0, "2026-10-08");
    expect(siguientePaso({ ...d, cadena: c1 })?.n).toBe(2);
    const c2 = marcarPaso(c1, 1, "2026-10-09");
    expect(c2).toEqual(["2026-10-08", "2026-10-09"]);
    expect(cadenaCompleta({ ...d, cadena: c2 })).toBe(true); // el 3 es opcional
    expect(pasosCadena({ ...d, cadena: c2 })[2].disponible).toBe(true);
    expect(marcarPaso(c2, 1, null)).toEqual(["2026-10-08"]);
  });

  it("contactos referidos: piden relación, no entran al saludo diario hasta terminar la cadena", () => {
    const c = crearContacto({ nombre: "Carla", celular: "0991234567", referidor: "María" }, 1);
    expect(errorContacto(c)).toBe("Elige la relación con quien lo refirió");
    const ok = { ...c, relacion: "Amiga" };
    expect(errorContacto(ok)).toBe("");
    expect(enCadena(ok)).toBe(true);
    expect(porSaludar([ok], "2026-10-08")).toEqual([]);
    const listo = { ...ok, cadena: ["2026-10-01", "2026-10-02"] };
    expect(porSaludar([listo], "2026-10-08").map((x) => x.id)).toEqual([ok.id]);
  });

  it("al pasar a prospecto se copian referidor, relación y cadena", () => {
    const c = { ...crearContacto({ nombre: "Carla", referidor: "María", relacion: "Amiga" }, 1), cadena: ["2026-10-01"] };
    expect(datosParaFicha(c)).toMatchObject({ origen: "Referido", referidor: "María", relacion: "Amiga", cadena: ["2026-10-01"] });
  });

  it("en la ficha, quién lo refirió y la relación solo aparecen si el origen es Referido", () => {
    expect(campoActivo(CAMPO.referidor, ficha("nuevo"))).toBe(false);
    expect(campoActivo(CAMPO.relacion, ficha("nuevo", { origen: "Referido" }))).toBe(true);
  });
});

describe("saludo de referidos editable", () => {
  it("usa el texto de Configuración → Referidos (o el de fábrica si no se cambió)", async () => {
    const { ajustesIniciales } = await import("./ajustes");
    const a = ajustesIniciales();
    expect(textoPaso(0, d, undefined, a)).toBe(textoPaso(0, d));
    a.mensajes.ref1 = { texto: "Hola {nombre}, {saludo}. {referidor}{relacion} me pasó tu número. Soy {asesor}." };
    expect(textoPaso(0, d, undefined, a)).toBe("Hola Carla, buenos días. María, su amiga, me pasó tu número. Soy Bracho.");
    expect(pasosCadena(d, undefined, a)[0].texto).toContain("me pasó tu número");
    // Los otros pasos siguen con el de fábrica
    expect(textoPaso(1, d, undefined, a)).toContain("quiso regalarle una asesoría");
  });
});
