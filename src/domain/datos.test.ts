import { contarDatos, datosRecabados } from "./datos";
import { ficha, hist } from "./test-utils";

describe("datos recabados", () => {
  it("no cuenta la etapa, el nombre, el WhatsApp ni los checks", () => {
    expect(contarDatos(ficha("nuevo", { nombre: "Ana", whatsapp: "099", etapa: "Presentado", c_valor: true }))).toBe(0);
  });

  it("cuenta campos llenos que aplican, motivos e historial", () => {
    const p = ficha("cambio", { edad: "40", motivos: ["red"], red_falta: "cardiólogo", historial: hist(1), cobertura: "IESS" });
    expect(datosRecabados(p).sort()).toEqual(["contactos", "edad", "motivos", "red_falta"]);
  });

  it("los detalles de un motivo no elegido no cuentan", () => {
    expect(contarDatos(ficha("cambio", { ded_anual: "500" }))).toBe(0);
  });
});
