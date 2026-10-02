/**
 * Precarga de planes desde los PDF de la Biblioteca. Para no inventar nada:
 * solo copia líneas que están escritas en el documento (tal cual, sin
 * reescribirlas) y anota la página de donde salen. Lo que no encuentra queda
 * vacío para que el asesor lo complete o lo deje así. Siempre se revisa
 * antes de guardar.
 */
import { lineas, normalizar, type Documento, type Plan } from "./biblioteca";
import { conceptosLlenos, tablaDesdeTexto, type TablaCoberturas } from "./comparar";

export type CampoExtraido = "coberturas" | "carencias" | "exclusiones" | "beneficios" | "garantias";

/** Títulos de sección que suelen tener los anexos y condiciones. */
const TITULOS: readonly [CampoExtraido, RegExp][] = [
  ["carencias", /^(carencias?|periodos? de (carencia|espera)|tiempos? de espera)\b/],
  ["exclusiones", /^(exclusiones|gastos no cubiertos|no (se )?cubre|riesgos excluidos)\b/],
  ["garantias", /^(garantias?)\b/],
  ["coberturas", /^(coberturas?|tabla de beneficios|beneficios cubiertos|prestaciones|plan de beneficios)\b/],
  ["beneficios", /^(beneficios adicionales|servicios adicionales|valores agregados|asistencias?|beneficios)\b/],
];

/** Líneas sueltas que, aunque no estén bajo un título, dicen claramente qué son. */
const SUELTAS: readonly [CampoExtraido, RegExp][] = [
  ["carencias", /(carencia|periodo de espera|tiempo de espera).*\d+\s*(mes|dia)/],
  ["exclusiones", /^(se excluye|no cubre|excluid[oa]s?\b|exclusion\b)/],
];

const MAX_POR_CAMPO = 12;
const MAX_LARGO = 220;

export interface Precarga {
  campos: Partial<Record<CampoExtraido, string[]>>;
  /** Páginas (desde 1) de donde salió cada campo. */
  paginas: Partial<Record<CampoExtraido | "tabla" | "precio", number[]>>;
  tabla: TablaCoberturas;
  precio: string;
  /** "Anexo Plan X, págs. 2, 3, 5" */
  fuente: string;
}

function esTitulo(l: string): CampoExtraido | null {
  const n = normalizar(l).replace(/[:.\-–]+$/, "").trim();
  if (n.length > 60) return null;
  // Lo que va antes de los dos puntos es el posible título ("Carencias: maternidad 10 meses").
  const antes = n.split(":")[0].trim();
  for (const [campo, re] of TITULOS) {
    const m = re.exec(antes);
    // "No cubre tratamientos estéticos" es una exclusión, no un título: el título es corto o es todo el texto.
    if (m && (m[0].length === antes.length || antes.split(/\s+/).length <= 3)) return campo;
  }
  return null;
}

function limpiar(l: string): string {
  return l.replace(/^\s*([-•*·▪●◦]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim();
}

/** Línea que vale la pena copiar (no un número de página, ni un párrafo enorme). */
function util(l: string): boolean {
  return l.length >= 4 && l.length <= MAX_LARGO && /[a-záéíóúñ]/i.test(l) && !/^p[aá]gina\s+\d+/i.test(l);
}

export function precargaDesdeDocumento(doc: Documento): Precarga {
  const campos: Precarga["campos"] = {};
  const paginas: Precarga["paginas"] = {};
  const anotar = (k: keyof Precarga["paginas"], pag: number) => {
    const xs = (paginas[k] ??= []);
    if (!xs.includes(pag)) xs.push(pag);
  };
  const agregar = (campo: CampoExtraido, l: string, pag: number) => {
    const t = limpiar(l);
    if (!util(t) || esTitulo(t)) return;
    // Prima, deducible y copago son datos de la tabla (y del precio), no puntos de una lista.
    const tb = tablaDesdeTexto(t);
    if (tb.prima || tb.deducible || tb.copago) return;
    const xs = (campos[campo] ??= []);
    if (xs.length >= MAX_POR_CAMPO || xs.some((x) => normalizar(x) === normalizar(t))) return;
    xs.push(t);
    anotar(campo, pag);
  };

  // Líneas que sirven para la tabla (no las de carencias ni exclusiones: "Maternidad: 10 meses" es una espera).
  const paraTabla: string[][] = doc.paginas.map(() => []);

  doc.paginas.forEach((texto, i) => {
    const pag = i + 1;
    let actual: CampoExtraido | null = null;
    let vacias = 0;
    for (const bruta of texto.split(/\r?\n/)) {
      const l = bruta.trim();
      if (!l) {
        if (++vacias >= 2) actual = null;
        continue;
      }
      vacias = 0;
      const titulo = esTitulo(l);
      if (titulo) {
        actual = titulo;
        // "Carencias: maternidad 10 meses" → lo que va después de los dos puntos también cuenta
        const resto = l.split(/:\s*/).slice(1).join(": ").trim();
        if (resto) agregar(titulo, resto, pag);
        continue;
      }
      // Si la línea dice claramente qué es (exclusión, carencia), manda sobre el título de la sección.
      const n = normalizar(limpiar(l));
      const suelta = SUELTAS.find(([, re]) => re.test(n));
      const campo = suelta?.[0] ?? actual;
      if (campo) agregar(campo, l, pag);
      if (campo !== "carencias" && campo !== "exclusiones") paraTabla[i].push(l);
    }
  });

  // Tabla de coberturas: valores que el documento escribe junto a cada concepto
  const tabla: TablaCoberturas = {};
  paraTabla.forEach((ls, i) => {
    const t = tablaDesdeTexto(ls.join("\n"));
    for (const [k, v] of Object.entries(t)) {
      if (v && !tabla[k as keyof TablaCoberturas]) {
        tabla[k as keyof TablaCoberturas] = v;
        anotar("tabla", i + 1);
      }
    }
  });
  const precio = tabla.prima ?? "";
  if (precio) anotar("precio", (paginas.tabla ?? [1])[0]);

  const todas = [...new Set(Object.values(paginas).flat())].sort((a, b) => a - b);
  const fuente = todas.length ? `${doc.nombre}, ${todas.length === 1 ? "pág." : "págs."} ${todas.join(", ")}` : doc.nombre;
  return { campos, paginas, tabla, precio, fuente };
}

/** Cuántas cosas encontró (para el aviso). */
export function totalPrecarga(x: Precarga): number {
  return Object.values(x.campos).reduce((a, xs) => a + (xs?.length ?? 0), 0) + conceptosLlenos(x.tabla).length;
}

/**
 * Pone lo encontrado en el plan sin pisar lo que ya está escrito: las listas
 * suman las líneas que faltan; la tabla solo llena conceptos vacíos.
 */
export function aplicarPrecarga(plan: Plan, x: Precarga, doc: Documento): Plan {
  const p: Plan = { ...plan };
  for (const [campo, nuevas] of Object.entries(x.campos) as [CampoExtraido, string[]][]) {
    const actuales = lineas(p[campo]);
    const sumar = nuevas.filter((l) => !actuales.some((a) => normalizar(a) === normalizar(l)));
    if (sumar.length) p[campo] = [...actuales, ...sumar].join("\n");
  }
  const tabla = { ...((p.tabla ?? {}) as TablaCoberturas) };
  for (const [k, v] of Object.entries(x.tabla)) if (v && !tabla[k as keyof TablaCoberturas]?.trim()) tabla[k as keyof TablaCoberturas] = v;
  p.tabla = tabla;
  if (!p.nombre.trim()) p.nombre = doc.plan.trim() || doc.nombre;
  if (!p.precio.trim() && x.precio) p.precio = x.precio;
  if (!p.fuente.trim()) p.fuente = x.fuente;
  else if (!p.fuente.includes(doc.nombre)) p.fuente = `${p.fuente}; ${x.fuente}`;
  return p;
}
