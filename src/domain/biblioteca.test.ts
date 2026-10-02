import {
  argumentosPara,
  buscar,
  crearArgumento,
  etiquetasDeFicha,
  limpiarTexto,
  lineas,
  normalizar,
  paginarTexto,
  resaltar,
  type Documento,
} from "./biblioteca";
import { ficha } from "./test-utils";

function doc(id: string, paginas: string[]): Documento {
  return { id, nombre: "Doc " + id, tipo: "condiciones", plan: "", paginas, archivo: false, bytes: 0, creado: 1, mod: 1 };
}

describe("biblioteca: texto", () => {
  it("normaliza tildes y mayúsculas", () => {
    expect(normalizar("Cirugía AMBULATORIA")).toBe("cirugia ambulatoria");
  });

  it("limpia el texto extraído y une palabras cortadas", () => {
    expect(limpiarTexto("  Hola   mundo \n\n\n\n mater-\nnidad ")).toBe("Hola mundo\n\nmaternidad");
  });

  it("líneas: quita viñetas y vacías", () => {
    expect(lineas("- Uno\n\n• Dos\n  * Tres ")).toEqual(["Uno", "Dos", "Tres"]);
    expect(lineas(undefined)).toEqual([]);
  });

  it("pagina el texto pegado por párrafos", () => {
    const t = Array.from({ length: 5 }, (_, i) => "p" + i + " " + "x".repeat(40)).join("\n\n");
    const pags = paginarTexto(t, 100);
    expect(pags.length).toBeGreaterThan(1);
    expect(pags.join("\n\n")).toBe(limpiarTexto(t));
  });
});

describe("biblioteca: búsqueda", () => {
  const docs = [
    doc("a", ["Coberturas generales del plan", "La maternidad tiene un período de carencia de diez meses."]),
    doc("b", ["Carencia: cirugías programadas, seis meses. Carencia de maternidad según anexo."]),
  ];

  it("encuentra páginas con todas las palabras, sin importar tildes", () => {
    const r = buscar(docs, "CARENCIA maternidad");
    expect(r.map((x) => [x.docId, x.pagina])).toEqual([
      ["b", 1],
      ["a", 2],
    ]);
    expect(buscar(docs, "cirugias")[0].docId).toBe("b");
  });

  it("no encuentra si falta una palabra; ignora consultas vacías", () => {
    expect(buscar(docs, "maternidad odontología")).toEqual([]);
    expect(buscar(docs, "  a ")).toEqual([]);
  });

  it("el fragmento rodea la coincidencia", () => {
    const largo = doc("c", ["x ".repeat(300) + "deducible anual " + "y ".repeat(300)]);
    const [r] = buscar([largo], "deducible");
    expect(r.fragmento).toContain("deducible anual");
    expect(r.fragmento.startsWith("…")).toBe(true);
    expect(r.fragmento.endsWith("…")).toBe(true);
  });

  it("resalta las palabras buscadas", () => {
    const partes = resaltar("La cirugía programada", "cirugia");
    expect(partes.filter((x) => x.m).map((x) => x.t)).toEqual(["cirugía"]);
    expect(partes.map((x) => x.t).join("")).toBe("La cirugía programada");
  });
});

describe("biblioteca: argumentos por ficha", () => {
  it("etiquetas de la ficha: objeción, motivos, familia, edad, emergencia", () => {
    const p = ficha("cambio", {
      objecion: "Precio",
      motivos: ["costos"],
      depende: "Dos hijos",
      edad: "60",
      emergencia: "No sabría",
    });
    expect(etiquetasDeFicha(p).sort()).toEqual(
      ["general", "obj:Precio", "mot:costos", "familia", "mayor", "emergencia"].sort(),
    );
    expect(etiquetasDeFicha(ficha("nuevo", { objecion: "Ninguna" }))).toEqual(["general"]);
  });

  it("ordena por coincidencias específicas y deja los generales al final", () => {
    const g = crearArgumento(1, { id: "g", texto: "g", etiquetas: ["general"] });
    const pr = crearArgumento(1, { id: "pr", texto: "pr", etiquetas: ["obj:Precio"] });
    const otro = crearArgumento(1, { id: "o", texto: "o", etiquetas: ["mot:liquidez"] });
    const r = argumentosPara(ficha("nuevo", { objecion: "Precio" }), [g, otro, pr]);
    expect(r.map((a) => a.id)).toEqual(["pr", "g"]);
  });
});
