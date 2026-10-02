import { csvCell, exportarCSV } from "./csv";
import { diasHasta, fmtFecha, usd } from "./fechas";
import { crearProspecto, num, numeroWhatsApp, telefonoParaLlamar, tieneConsentimiento } from "./ficha";
import { contactoVencido, filtrar, ordenar } from "./lista";
import { ficha, HOY } from "./test-utils";

describe("fechas y montos", () => {
  it("diasHasta", () => {
    expect(diasHasta("2026-10-01", HOY)).toBe(1);
    expect(diasHasta("2026-09-29", HOY)).toBe(-1);
    expect(diasHasta("2027-09-30", HOY)).toBe(365);
  });
  it("fmtFecha y usd", () => {
    expect(fmtFecha("2026-03-05")).toBe("5 mar 2026");
    expect(usd(15)).toBe("$15");
    expect(usd(15.5)).toBe("$15.50");
  });
  it("num acepta coma decimal y rechaza texto", () => {
    expect(num(ficha("nuevo", { precio: "12,5" }), "precio")).toBe(12.5);
    expect(num(ficha("nuevo", { precio: "doce" }), "precio")).toBeNull();
    expect(num(ficha("nuevo"), "precio")).toBeNull();
  });
});

describe("ficha nueva y consentimiento", () => {
  it("una ficha recién creada no tiene consentimiento", () => {
    const p = crearProspecto("cambio", 1000);
    expect(p).toMatchObject({ tipo: "cambio", etapa: "Primer contacto", historial: [], creado: 1000, mod: 1000 });
    expect(tieneConsentimiento(p)).toBe(false);
    expect(tieneConsentimiento({ ...p, consentimiento: { ts: 5 } })).toBe(true);
  });
  it("ids distintos aunque se creen en el mismo milisegundo", () => {
    expect(crearProspecto("nuevo", 1).id).not.toBe(crearProspecto("nuevo", 1).id);
  });
});

describe("lista", () => {
  const items = [
    ficha("nuevo", { id: "a", creado: 1 }),
    ficha("nuevo", { id: "b", creado: 2, prox: "2026-10-05" }),
    ficha("cambio", { id: "c", creado: 3, prox: "2026-09-01", etapa: "Segunda reunión" }),
    ficha("cambio", { id: "d", creado: 4 }),
  ];
  it("ordena por próximo contacto y luego por creación descendente", () => {
    expect(ordenar(items).map((p) => p.id)).toEqual(["c", "b", "d", "a"]);
  });
  it("filtra por tipo y etapa", () => {
    expect(filtrar(items, { tipo: "cambio", etapa: "Todos" }).map((p) => p.id)).toEqual(["c", "d"]);
    expect(filtrar(items, { tipo: "Todos", etapa: "Segunda reunión" }).map((p) => p.id)).toEqual(["c"]);
  });
  it("vencido: fecha hoy o pasada, salvo cerrado o perdido", () => {
    expect(contactoVencido(ficha("nuevo", { prox: HOY }), HOY)).toBe(true);
    expect(contactoVencido(ficha("nuevo", { prox: "2026-10-01" }), HOY)).toBe(false);
    expect(contactoVencido(ficha("nuevo", { prox: "2026-01-01", etapa: "Cerrado" }), HOY)).toBe(false);
    expect(contactoVencido(ficha("nuevo"), HOY)).toBe(false);
  });
});

/** Parte una línea CSV respetando comillas. */
function celdas(linea: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < linea.length; i++) {
    const ch = linea[i];
    if (q) {
      if (ch === '"' && linea[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') q = false;
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") {
      out.push(cur);
      cur = "";
    }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

describe("CSV", () => {
  it("escapa comillas, comas y saltos de línea", () => {
    expect(csvCell('dijo "hola", ok')).toBe('"dijo ""hola"", ok"');
    expect(csvCell("a\nb")).toBe('"a\nb"');
    expect(csvCell(null)).toBe("");
  });
  it("los campos que no aplican salen en blanco y los checks en Sí/No", () => {
    const csv = exportarCSV([ficha("cambio", { ded_anual: "500", pv_bienvenida: true, nombre: "Ana", etapa: "Cerrado" })]);
    expect(csv.startsWith("﻿Tipo,Consentimiento,Nombre")).toBe(true);
    const [head, row] = csv.slice(1).split("\n");
    const h = celdas(head);
    const r = celdas(row);
    expect(r).toHaveLength(h.length);
    expect(r[h.indexOf("Pagado en deducibles y copagos el último año (USD)")]).toBe("");
    expect(r[h.indexOf("Bienvenida: le expliqué cómo usar su plan y a quién llamar")]).toBe("Sí");
    expect(r[h.indexOf("Nombre")]).toBe("Ana");
    expect(h.at(-3)).toBe("Preexistencias declaradas");
  });
});

describe("teléfono para llamar", () => {
  const tel = (whatsapp: string) => telefonoParaLlamar(ficha("nuevo", { whatsapp }));
  it("limpia espacios, guiones y paréntesis", () => {
    expect(tel("099 123 4567")).toBe("0991234567");
    expect(tel("(02) 245-6789")).toBe("022456789");
    expect(tel("+593 99 123 4567")).toBe("+593991234567");
  });
  it("sin número o muy corto: no se puede llamar", () => {
    expect(tel("")).toBeNull();
    expect(tel("12345")).toBeNull();
    expect(tel("no tiene")).toBeNull();
  });
});

describe("número para WhatsApp", () => {
  const wa = (whatsapp: string) => numeroWhatsApp(ficha("nuevo", { whatsapp }));
  it("agrega el código de Ecuador a los números locales", () => {
    expect(wa("099 123 4567")).toBe("593991234567");
    expect(wa("991234567")).toBe("593991234567");
  });
  it("respeta los números que ya son internacionales", () => {
    expect(wa("+593 99 123 4567")).toBe("593991234567");
    expect(wa("593991234567")).toBe("593991234567");
    expect(wa("00593 99 123 4567")).toBe("593991234567");
    expect(wa("+1 (305) 555-0100")).toBe("13055550100");
  });
  it("sin número válido no hay botón", () => {
    expect(wa("")).toBeNull();
    expect(wa("123")).toBeNull();
    expect(wa("no tiene")).toBeNull();
  });
});
