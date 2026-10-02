import { argumentosDelSistema, etiquetasDeTexto } from "./aprender";
import { crearPlan, type Documento } from "./biblioteca";
import { ficha } from "./test-utils";

const plan = (nombre: string, extra: Record<string, unknown> = {}) => ({ ...crearPlan(1), id: nombre, nombre, ...extra });

describe("argumentos del sistema", () => {
  it("etiquetas por palabras", () => {
    expect(etiquetasDeTexto("Reembolso en 10 días")).toEqual(["mot:reembolsos"]);
    expect(etiquetasDeTexto("Cubre maternidad y parto")).toEqual(expect.arrayContaining(["familia", "mot:cobertura"]));
    expect(etiquetasDeTexto("Algo cualquiera")).toEqual(["general"]);
  });

  it("beneficios exclusivos y el mejor de cada concepto", () => {
    const a = plan("Plus", { beneficios: "Telemedicina 24/7\nChequeo anual", tabla: { deducible: "$300", maximo: "$100.000" } });
    const b = plan("Básico", { beneficios: "Chequeo anual", tabla: { deducible: "$800", maximo: "$50.000" } });
    const args = argumentosDelSistema([a, b], [], []);
    const ex = args.filter((x) => x.origen === "exclusivo");
    expect(ex.map((x) => x.titulo)).toEqual(["Solo Plus incluye: Telemedicina 24/7"]);
    expect(ex[0].etiquetas).toContain("mot:atencion");
    const mejor = args.filter((x) => x.origen === "mejor").map((x) => x.texto);
    expect(mejor).toContain("Deducible: $300 con Plus, el más bajo entre los planes que manejo.");
    expect(mejor).toContain("Cobertura máxima anual: $100.000 con Plus, el más alto entre los planes que manejo.");
    // Honestidad: siempre con fuente y "validar con la aseguradora"
    expect(args.every((x) => x.fuente.endsWith("validar con la aseguradora"))).toBe(true);
  });

  it("aprende de las comparaciones con planes actuales de clientes", () => {
    const a = plan("Plus", { tabla: { maternidad: "$2.000", reembolso: "10 días" } });
    const cliente = (id: string) =>
      ficha("cambio", { id, planActual: { tabla: { maternidad: "No incluye", reembolso: "30 días" } } });
    const args = argumentosDelSistema([a], [], [cliente("c1"), cliente("c2"), ficha("cambio", { id: "c3" })]);
    const comp = args.filter((x) => x.origen === "comparaciones").map((x) => x.texto);
    expect(comp).toContain(
      "En 2 de 2 planes actuales que revisé, maternidad no estaba incluido. Vale la pena revisar si el suyo lo tiene.",
    );
    expect(comp).toContain("En 2 comparaciones con planes actuales de clientes, Plus mejoró días para el reembolso.");
  });

  it("toma frases positivas de los documentos (no las exclusiones)", () => {
    const d: Documento = {
      id: "d1",
      nombre: "Anexo Plus",
      tipo: "anexo",
      plan: "Plus",
      paginas: [
        "Introducción. El plan cubre el 100% de la hospitalización en la red de clínicas. No cubre tratamientos estéticos de ningún tipo en ningún caso.",
      ],
      archivo: false,
      bytes: 0,
      creado: 1,
      mod: 1,
    };
    const args = argumentosDelSistema([], [d], []);
    expect(args.map((x) => x.texto)).toEqual(["«El plan cubre el 100% de la hospitalización en la red de clínicas.»"]);
    expect(args[0].fuente).toBe("Anexo Plus, pág. 1 · validar con la aseguradora");
  });

  it("no inventa: sin material, no hay argumentos", () => {
    expect(argumentosDelSistema([plan("Único", { beneficios: "Algo" })], [], [])).toEqual([]);
  });
});
