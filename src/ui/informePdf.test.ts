import { perfilDe } from "../domain/ajustes";
import { informe } from "../domain/informe";
import { propuesta } from "../domain/propuesta";
import { ficha } from "../domain/test-utils";
import { armarPDF, nombreArchivoInforme } from "./informePdf";

const perfil = perfilDe(undefined);

describe("PDF de los informes", () => {
  it("arma los dos informes (aun sin las fuentes) con su nombre de archivo", async () => {
    const p = ficha("cambio", { nombre: "Luis Paz", ocupacion: "Albañil", objeciones2: ["precio"], productos: [{ id: "a", nombre: "Plan A", deducible: "", mensual: "80" }] });
    const i1 = informe(p, perfil, "2026-10-07");
    const i2 = propuesta(p, perfil, "2026-10-09");
    const d1 = await armarPDF(i1, null);
    const d2 = await armarPDF(i2, null);
    expect(d1.getNumberOfPages()).toBeGreaterThanOrEqual(1);
    expect(d2.output().startsWith("%PDF-")).toBe(true);
    // La oferta irresistible va al final de los dos informes
    expect(d1.output()).toContain("NUESTRA OFERTA PARA USTED");
    expect(d2.output()).toContain("SU INVERSI");
    // Sin ocultar nada: el deducible siempre va explicado
    expect(d2.output()).toContain("SU DEDUCIBLE");
    // Con la foto del asesor en el membrete
    const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const conFoto = await armarPDF(i2, null, png);
    expect(conFoto.output()).toContain("/Subtype /Image");
    expect(d2.output()).not.toContain("/Subtype /Image");
    expect(nombreArchivoInforme(i1)).toBe("informe-Luis-Paz-2026-10-07.pdf");
    expect(nombreArchivoInforme(i2)).toBe("propuesta-Luis-Paz-2026-10-09.pdf");
  });
});
