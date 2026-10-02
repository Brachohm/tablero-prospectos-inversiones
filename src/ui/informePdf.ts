/**
 * PDF de los informes post reunión, armado en el dispositivo (jsPDF, se carga
 * solo al usarlo). Pensado para quien recién empieza: poco texto, tarjetas,
 * gráficos simples (nivel de protección, medidores de riesgo, barras de valor)
 * y una línea de pasos estilo juego. Tipografía de la app (Sora y Plus
 * Jakarta Sans); si las fuentes no cargan, usa Helvetica.
 */
import type { jsPDF as JsPDF } from "jspdf";
import { fmtFecha } from "../domain/fechas";
import { NOTA_INFORME, type EstadoCobertura, type Informe, type RiesgosInforme } from "../domain/informe";
import { fmtUSD as fmtUSD0, type OfertaInforme } from "../domain/oferta";
import { NOTA_PROPUESTA, type Comparativo, type ProductoPropuesta, type Propuesta } from "../domain/propuesta";
import { nombreCategoria } from "../domain/bondades";
import { VALIDAR } from "../config/saludsa";
import { AVISO_PROYECCION, ESCENARIOS_L, type Escenarios } from "../config/proyeccion";
import type { Proyeccion } from "../domain/proyeccion";
import sora800 from "../assets/fonts/sora-800.ttf?url";
import sora600 from "../assets/fonts/sora-600.ttf?url";
import jakarta400 from "../assets/fonts/jakarta-400.ttf?url";
import jakarta700 from "../assets/fonts/jakarta-700.ttf?url";

export type InformeReunion = Informe | Propuesta;

type RGB = [number, number, number];
const C = {
  violeta: [91, 61, 245] as RGB,
  violetaSuave: [236, 232, 255] as RGB,
  violetaMedio: [124, 101, 248] as RGB,
  tinta: [27, 31, 69] as RGB,
  gris: [105, 112, 154] as RGB,
  linea: [224, 228, 243] as RGB,
  fondo: [241, 243, 251] as RGB,
  menta: [18, 184, 134] as RGB,
  mentaSuave: [221, 246, 236] as RGB,
  coral: [255, 107, 87] as RGB,
  coralSuave: [255, 233, 229] as RGB,
  sol: [255, 176, 32] as RGB,
  solSuave: [255, 241, 212] as RGB,
  solOscuro: [138, 90, 0] as RGB,
  blanco: [255, 255, 255] as RGB,
};

/** Montos: enteros sin decimales; si no, con dos ($18,50). */
const fmtUSD = (n: number) =>
  Number.isInteger(n) ? fmtUSD0(n) : "$" + n.toLocaleString("es-EC", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Las fuentes base no dibujan emojis: se quitan. */
const limpio = (s: string) => s.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s{2,}/g, " ").trim();

export function nombreArchivoInforme(inf: InformeReunion): string {
  const n = inf.cliente.trim().replace(/\s+/g, "-").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\w-]/g, "");
  return `${inf.n === 2 ? "propuesta" : "informe"}-${n || "reunion"}-${inf.fecha}.pdf`;
}

/* ---------- Fuentes ---------- */

export type Fuentes = Record<"sora800" | "sora600" | "jakarta400" | "jakarta700", string>;

let cacheFuentes: Promise<Fuentes | null> | null = null;

function base64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Descarga (una vez) las fuentes del PDF. Sin ellas, el PDF sale con Helvetica. */
export function cargarFuentes(): Promise<Fuentes | null> {
  cacheFuentes ??= (async () => {
    try {
      const urls = { sora800, sora600, jakarta400, jakarta700 };
      const pares = await Promise.all(
        Object.entries(urls).map(async ([k, u]) => {
          const r = await fetch(u);
          if (!r.ok) throw new Error(u);
          return [k, base64(await r.arrayBuffer())] as const;
        }),
      );
      return Object.fromEntries(pares) as Fuentes;
    } catch {
      cacheFuentes = null;
      return null;
    }
  })();
  return cacheFuentes;
}

/* ---------- Kit de dibujo ---------- */

class Lienzo {
  readonly W: number;
  readonly H: number;
  readonly M = 40;
  y = 0;
  private titulo = "";
  private readonly display: string;
  private readonly cuerpo: string;
  private readonly conFuentes: boolean;

  readonly doc: JsPDF;
  /** Foto del asesor (data URL JPEG/PNG) para el membrete, o null. */
  readonly foto: string | null;
  private firmaBanda = "";

  constructor(doc: JsPDF, fuentes: Fuentes | null, foto: string | null = null) {
    this.doc = doc;
    this.foto = foto;
    this.W = doc.internal.pageSize.getWidth();
    this.H = doc.internal.pageSize.getHeight();
    this.conFuentes = !!fuentes;
    if (fuentes) {
      const reg = (archivo: string, b64: string, familia: string, estilo: string) => {
        doc.addFileToVFS(archivo, b64);
        doc.addFont(archivo, familia, estilo);
      };
      reg("sora-800.ttf", fuentes.sora800, "Sora", "bold");
      reg("sora-600.ttf", fuentes.sora600, "Sora", "normal");
      reg("jakarta-400.ttf", fuentes.jakarta400, "Jakarta", "normal");
      reg("jakarta-700.ttf", fuentes.jakarta700, "Jakarta", "bold");
    }
    this.display = fuentes ? "Sora" : "helvetica";
    this.cuerpo = fuentes ? "Jakarta" : "helvetica";
  }

  get ancho() {
    return this.W - this.M * 2;
  }

  /** d = display fuerte, s = display semi, c = cuerpo, cb = cuerpo negrita. */
  fuente(t: "d" | "s" | "c" | "cb", tam: number, color: RGB = C.tinta) {
    const [f, e] =
      t === "d"
        ? [this.display, "bold"]
        : t === "s"
          ? [this.display, this.conFuentes ? "normal" : "bold"]
          : [this.cuerpo, t === "cb" ? "bold" : "normal"];
    this.doc.setFont(f, e);
    this.doc.setFontSize(tam);
    this.doc.setTextColor(...color);
  }

  lineas(t: string, ancho: number): string[] {
    return this.doc.splitTextToSize(limpio(t), ancho) as string[];
  }

  /** Alto de un párrafo con la fuente actual. */
  alto(t: string, ancho: number, tam: number, inter = 1.35): number {
    return this.lineas(t, ancho).length * tam * inter;
  }

  /** Escribe un párrafo (con la fuente actual) desde `y` (arriba) y devuelve el alto usado. */
  texto(t: string, x: number, y: number, ancho: number, tam: number, inter = 1.35): number {
    const ls = this.lineas(t, ancho);
    ls.forEach((l, i) => this.doc.text(l, x, y + tam + i * tam * inter - 2));
    return ls.length * tam * inter;
  }

  caja(x: number, y: number, w: number, h: number, fondo: RGB, r = 12) {
    this.doc.setFillColor(...fondo);
    this.doc.roundedRect(x, y, w, h, r, r, "F");
  }

  /** Nueva página si no cabe `h`. */
  cabe(h: number) {
    if (this.y + h <= this.H - 56) return;
    this.doc.addPage();
    this.doc.setFillColor(...C.violeta);
    this.doc.rect(0, 0, this.W, 30, "F");
    this.fuente("s", 9, C.blanco);
    this.doc.text(limpio(this.titulo), this.M, 19);
    // Membrete en cada página: su nombre y su foto a la derecha
    const xFoto = this.W - this.M - 11;
    if (this.firmaBanda) this.doc.text(limpio(this.firmaBanda), this.foto ? xFoto - 18 : this.W - this.M, 19, { align: "right" });
    if (this.foto) this.fotoCirculo(xFoto, 15, 11, 1.5);
    this.y = 52;
  }

  /** La foto del asesor en un círculo con borde blanco. */
  fotoCirculo(cx: number, cy: number, r: number, borde: number) {
    if (!this.foto) return;
    const { doc } = this;
    doc.setFillColor(...C.blanco);
    doc.circle(cx, cy, r + borde, "F");
    try {
      doc.saveGraphicsState();
      doc.circle(cx, cy, r, null as never);
      doc.clip();
      doc.discardPath();
      doc.addImage(this.foto, this.foto.startsWith("data:image/png") ? "PNG" : "JPEG", cx - r, cy - r, r * 2, r * 2);
    } catch {
      /* si la imagen no se puede leer, queda el círculo blanco */
    } finally {
      doc.restoreGraphicsState();
    }
  }

  encabezado(titulo: string, sub: string, asesor: string, nivel: string, nombre = "") {
    this.titulo = titulo;
    this.firmaBanda = nombre;
    const { doc, W, M } = this;
    doc.setFillColor(...C.violeta);
    doc.rect(0, 0, W, 150, "F");
    // Burbujas decorativas
    doc.setFillColor(...C.violetaMedio);
    doc.circle(W - 40, 20, 70, "F");
    doc.circle(W - 150, 140, 34, "F");
    doc.setFillColor(...C.sol);
    doc.circle(W - 92, 92, 9, "F");
    doc.setFillColor(...C.menta);
    doc.circle(W - 196, 40, 6, "F");
    // Insignia de nivel
    this.fuente("cb", 8.5, C.violeta);
    const wN = doc.getTextWidth(nivel) + 22;
    this.caja(M, 26, wN, 20, C.blanco, 10);
    doc.text(nivel, M + 11, 39.5);
    this.fuente("d", 25, C.blanco);
    doc.text(limpio(titulo), M, 80);
    this.fuente("c", 11.5, C.blanco);
    doc.text(limpio(sub), M, 102);
    this.fuente("c", 9.5, C.violetaSuave);
    this.lineas(asesor, W - M * 2 - (this.foto ? 150 : 120))
      .slice(0, 2)
      .forEach((l, i) => doc.text(l, M, 122 + i * 12));
    // Membrete: su foto y su nombre
    if (this.foto) {
      const cx = W - M - 46;
      this.fotoCirculo(cx, 72, 44, 3);
      if (nombre) {
        this.fuente("cb", 8.5, C.blanco);
        doc.text(limpio(nombre), cx, 136, { align: "center", maxWidth: 140 });
      }
    }
    this.y = 172;
  }

  /** Título de sección con un ícono de color. */
  seccion(t: string, color: RGB = C.violeta, glifo = "") {
    this.cabe(70);
    const { doc, M } = this;
    this.y += 8;
    this.caja(M, this.y, 22, 22, color, 7);
    const cx = M + 11;
    const cy = this.y + 11;
    doc.setDrawColor(...C.blanco);
    doc.setFillColor(...C.blanco);
    doc.setLineWidth(1.8);
    if (glifo === "estrella") {
      const pts: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 2.8 : 6.5;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
      }
      doc.lines(
        pts.slice(1).map(([x, y], i) => [x - pts[i][0], y - pts[i][1]]),
        pts[0][0],
        pts[0][1],
        [1, 1],
        "F",
        true,
      );
    } else if (glifo === "flecha") {
      doc.line(cx - 5, cy, cx + 5, cy);
      doc.line(cx + 1, cy - 4, cx + 5, cy);
      doc.line(cx + 1, cy + 4, cx + 5, cy);
    } else if (glifo === "subir") {
      doc.line(cx, cy + 5, cx, cy - 5);
      doc.line(cx - 4, cy - 1, cx, cy - 5);
      doc.line(cx + 4, cy - 1, cx, cy - 5);
    } else if (glifo === "check") {
      doc.lines(
        [
          [3, 3.2],
          [6, -7],
        ],
        cx - 4.5,
        cy + 0.2,
      );
    } else if (glifo) {
      this.fuente("d", 11, C.blanco);
      doc.text(glifo, cx, this.y + 15.5, { align: "center" });
    }
    this.fuente("d", 14.5, C.tinta);
    doc.text(limpio(t), M + 32, this.y + 16);
    this.y += 34;
  }

  /** Tarjetas pequeñas en cuadrícula (dato + valor). */
  datos(xs: { l: string; v: string }[], cols = 3) {
    const { M } = this;
    const g = 8;
    const w = (this.ancho - g * (cols - 1)) / cols;
    for (let i = 0; i < xs.length; i += cols) {
      const fila = xs.slice(i, i + cols);
      this.fuente("cb", 11);
      const h = Math.max(...fila.map((x) => this.alto(x.v, w - 20, 11))) + 30;
      this.cabe(h + g);
      fila.forEach((x, j) => {
        const xx = M + j * (w + g);
        this.caja(xx, this.y, w, h, C.fondo, 10);
        this.fuente("cb", 7.5, C.gris);
        this.doc.text(limpio(x.l).toUpperCase(), xx + 10, this.y + 15);
        this.fuente("cb", 11);
        this.texto(x.v, xx + 10, this.y + 19, w - 20, 11);
      });
      this.y += h + g;
    }
  }

  /** Viñetas con un punto de color. */
  vinetas(xs: string[], color: RGB = C.violeta, tam = 10.5) {
    for (const x of xs) {
      this.fuente("c", tam);
      const h = this.alto(x, this.ancho - 18, tam);
      this.cabe(h + 6);
      this.doc.setFillColor(...color);
      this.doc.circle(this.M + 4, this.y + tam * 0.62, 2.6, "F");
      this.fuente("c", tam);
      this.texto(x, this.M + 16, this.y, this.ancho - 18, tam);
      this.y += h + 6;
    }
  }

  /** Subtítulo en negrita. */
  sub(t: string) {
    this.fuente("cb", 10.5);
    this.cabe(40);
    this.doc.text(limpio(t), this.M, this.y + 10);
    this.y += 18;
  }

  /** Ícono de estado: visto, equis, medio o pregunta. */
  icono(x: number, y: number, estado: EstadoCobertura | "ok") {
    const { doc } = this;
    const fondo = estado === "si" || estado === "ok" ? C.menta : estado === "no" ? C.coral : estado === "parcial" ? C.sol : C.linea;
    doc.setFillColor(...fondo);
    doc.circle(x, y, 7.5, "F");
    doc.setDrawColor(...C.blanco);
    doc.setLineWidth(1.6);
    if (estado === "si" || estado === "ok")
      doc.lines(
        [
          [2.6, 2.8],
          [5, -6],
        ],
        x - 3.6,
        y + 0.2,
      );
    else if (estado === "no") {
      doc.line(x - 3, y - 3, x + 3, y + 3);
      doc.line(x + 3, y - 3, x - 3, y + 3);
    } else if (estado === "parcial") doc.line(x - 3.5, y, x + 3.5, y);
    else {
      this.fuente("cb", 9, C.gris);
      doc.text("?", x, y + 3.2, { align: "center" });
    }
  }

  /** Barra tipo batería de 10 segmentos con el nivel (0-100). */
  bateria(x: number, y: number, w: number, h: number, pct: number) {
    const n = 10;
    const g = 3;
    const sw = (w - g * (n - 1)) / n;
    const llenos = Math.round(pct / 10);
    const color = pct >= 70 ? C.menta : pct >= 40 ? C.sol : C.coral;
    for (let i = 0; i < n; i++) {
      this.doc.setFillColor(...(i < llenos ? color : C.linea));
      this.doc.roundedRect(x + i * (sw + g), y, sw, h, 3, 3, "F");
    }
  }

  /** Medidor de 3 barras (riesgo bajo/medio/alto). */
  pips(x: number, y: number, nivel: number) {
    const color = nivel >= 3 ? C.coral : nivel === 2 ? C.sol : C.menta;
    for (let i = 0; i < 3; i++) {
      this.doc.setFillColor(...(i < nivel ? color : C.linea));
      this.doc.roundedRect(x + i * 13, y, 10, 6, 3, 3, "F");
    }
  }

  /** Pastillas (chips) en línea. */
  chips(xs: string[], fondo: RGB, color: RGB) {
    const { doc, M } = this;
    let x = M;
    this.cabe(26);
    for (const t0 of xs) {
      const t = limpio(t0);
      this.fuente("cb", 9.5, color);
      const w = doc.getTextWidth(t) + 20;
      if (x + w > this.W - M) {
        x = M;
        this.y += 26;
        this.cabe(26);
      }
      this.caja(x, this.y, w, 20, fondo, 10);
      this.fuente("cb", 9.5, color);
      doc.text(t, x + 10, this.y + 13.5);
      x += w + 6;
    }
    this.y += 28;
  }

  /** Línea de pasos estilo juego (hechos con visto, el actual resaltado). */
  camino(pasos: string[], actual: number) {
    const { doc, M } = this;
    this.cabe(80);
    const n = pasos.length;
    const paso = this.ancho / n;
    const cy = this.y + 16;
    doc.setDrawColor(...C.linea);
    doc.setLineWidth(4);
    doc.line(M + paso / 2, cy, M + paso * (n - 0.5), cy);
    if (actual > 0) {
      doc.setDrawColor(...C.menta);
      doc.line(M + paso / 2, cy, M + paso * (Math.min(actual, n - 1) + 0.5), cy);
    }
    pasos.forEach((t, i) => {
      const cx = M + paso * (i + 0.5);
      const hecho = i < actual;
      const ahora = i === actual;
      doc.setFillColor(...(hecho ? C.menta : ahora ? C.violeta : C.blanco));
      doc.setDrawColor(...(hecho ? C.menta : ahora ? C.violeta : C.linea));
      doc.setLineWidth(2.5);
      doc.circle(cx, cy, 13, "FD");
      if (hecho) this.icono(cx, cy, "ok");
      else {
        this.fuente("d", 11, ahora ? C.blanco : C.gris);
        doc.text(String(i + 1), cx, cy + 4, { align: "center" });
      }
      this.fuente(ahora || hecho ? "cb" : "c", 9, ahora || hecho ? C.tinta : C.gris);
      this.lineas(t, paso - 10)
        .slice(0, 3)
        .forEach((l, k) => doc.text(l, cx, cy + 30 + k * 11, { align: "center" }));
    });
    this.y += 84;
  }

  /** Tarjeta de color con título y texto; avanza `y`. */
  tarjeta(titulo: string, cuerpo: string, fondo: RGB, colorTitulo: RGB, x = this.M, w = this.ancho, alto?: number) {
    this.fuente("c", 10.5);
    const h = alto ?? 36 + this.alto(cuerpo, w - 28, 10.5);
    this.cabe(h + 10);
    this.caja(x, this.y, w, h, fondo, 14);
    this.fuente("d", 11.5, colorTitulo);
    this.doc.text(limpio(titulo), x + 14, this.y + 22);
    this.fuente("c", 10.5);
    this.texto(cuerpo, x + 14, this.y + 28, w - 28, 10.5);
    this.y += h + 10;
  }

  pie(nota: string) {
    this.y += 6;
    this.fuente("c", 8.5, C.gris);
    const h = this.alto(nota, this.ancho, 8.5);
    this.cabe(h + 4);
    this.fuente("c", 8.5, C.gris);
    this.texto(nota, this.M, this.y, this.ancho, 8.5);
    const n = this.doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      this.doc.setPage(i);
      this.fuente("c", 8.5, C.gris);
      this.doc.text(`${i} / ${n}`, this.W - this.M, this.H - 24, { align: "right" });
    }
  }
}

function lineaAsesor(inf: InformeReunion): string {
  const a = inf.asesor;
  return [`${a.nombreCompleto || a.apodo}${a.rol ? " · " + a.rol : ""}`, a.celular?.trim() && `WhatsApp ${a.celular.trim()}`, a.correo?.trim()]
    .filter(Boolean)
    .join("  ·  ");
}

/* ---------- Riesgos por ocupación (los dos informes) ---------- */

function dibujarRiesgos(L: Lienzo, r: RiesgosInforme, conAtencion = true) {
  L.cabe(conAtencion ? 260 : 210);
  L.seccion("Su trabajo y su salud", C.sol, "!");
  L.fuente("c", 10, C.gris);
  L.y += L.texto(`${r.ocupacion} · ${r.grupo}. Riesgos frecuentes en su tipo de trabajo:`, L.M, L.y, L.ancho, 10) + 6;
  const col = (L.ancho - 10) / 2;
  const listas: [string, RiesgosInforme["laborales"]][] = [
    ["Laborales", r.laborales],
    ["Ergonómicos (postura y esfuerzo)", r.ergonomicos],
  ];
  const h = 34 + 3 * 30;
  L.cabe(h + 30);
  listas.forEach(([t, xs], i) => {
    const x = L.M + i * (col + 10);
    L.caja(x, L.y, col, h, C.fondo, 14);
    L.fuente("cb", 10, C.tinta);
    L.doc.text(t, x + 12, L.y + 20);
    xs.slice(0, 3).forEach((z, k) => {
      const yy = L.y + 36 + k * 30;
      L.pips(x + 12, yy + 2, z.nivel);
      L.fuente("c", 9.5);
      L.texto(z.t, x + 54, yy, col - 64, 9.5, 1.2);
    });
  });
  L.y += h + 6;
  L.fuente("c", 8.5, C.gris);
  L.doc.text("Riesgo:", L.M, L.y + 8);
  (
    [
      [1, "bajo"],
      [2, "medio"],
      [3, "alto"],
    ] as const
  ).forEach(([n, t], i) => {
    const x = L.M + 40 + i * 72;
    L.pips(x, L.y + 3, n);
    L.fuente("c", 8.5, C.gris);
    L.doc.text(t, x + 42, L.y + 8.5);
  });
  L.y += 22;
  if (conAtencion) {
    L.sub("Lo que podrías necesitar en una urgencia o atención:");
    L.chips([...r.atencion], C.solSuave, C.solOscuro);
  }
}

/* ---------- La oferta irresistible (al final de los dos informes) ---------- */

/** Lista con vistos dentro de una caja; devuelve el alto (o solo lo mide si `dibujar` es false). */
function listaVistos(L: Lienzo, xs: string[], x: number, y: number, w: number, dibujar = true, tam = 10): number {
  let yy = y;
  for (const t of xs) {
    if (dibujar) L.icono(x + 7, yy + 7, "ok");
    L.fuente("c", tam);
    yy += (dibujar ? L.texto(t, x + 20, yy, w - 20, tam, 1.25) : L.alto(t, w - 20, tam, 1.25)) + 6;
  }
  return yy - y;
}

function dibujarOferta(L: Lienzo, o: OfertaInforme, n: 1 | 2) {
  const { doc, M } = L;
  const W = L.ancho;
  // En grande: si no entra la parte de arriba, empieza en una página nueva.
  L.cabe(420);
  L.y += 10;

  // Portada de la oferta
  L.fuente("s", 13);
  const hSueno = L.alto(`“${o.sueno}”`, W - 48, 13);
  L.fuente("d", 26);
  const nombre = L.lineas(o.nombre, W - 48).slice(0, 2);
  const hHero = 74 + (nombre.length - 1) * 30 + (o.plan ? 18 : 0) + 32 + hSueno + 22;
  L.caja(M, L.y, W, hHero, C.violeta, 20);
  doc.setFillColor(...C.violetaMedio);
  doc.circle(M + W - 30, L.y + 26, 46, "F");
  doc.setFillColor(...C.sol);
  doc.circle(M + W - 74, L.y + 70, 7, "F");
  L.fuente("cb", 8.5, C.solOscuro);
  const etiqueta = "NUESTRA OFERTA PARA USTED";
  const we = doc.getTextWidth(etiqueta) + 22;
  L.caja(M + 24, L.y + 22, we, 20, C.sol, 10);
  L.fuente("cb", 8.5, C.solOscuro);
  doc.text(etiqueta, M + 35, L.y + 35.5);
  let y = L.y + 74;
  L.fuente("d", 26, C.blanco);
  nombre.forEach((l, i) => doc.text(l, M + 24, y + i * 30));
  y += (nombre.length - 1) * 30;
  if (o.plan) {
    L.fuente("c", 10.5, C.violetaSuave);
    doc.text(limpio(`Con ${o.plan}`), M + 24, y + 20);
    y += 18;
  }
  L.fuente("cb", 8.5, C.violetaSuave);
  doc.text("LO QUE VA A LOGRAR", M + 24, y + 26);
  L.fuente("s", 13, C.blanco);
  L.texto(`“${o.sueno}”`, M + 24, y + 32, W - 48, 13);
  L.y += hHero + 12;

  // Por qué funciona | Lo que yo hago por ti
  const col = (W - 12) / 2;
  const cols: [string, string[], RGB, RGB][] = [
    ["Por qué funciona", o.prueba.length ? o.prueba : ["Se lo detallo con el documento oficial del plan."], C.mentaSuave, C.menta],
    ["Lo que hago por usted", o.esfuerzo, C.violetaSuave, C.violeta],
  ];
  const hCol = 44 + Math.max(...cols.map(([, xs]) => listaVistos(L, xs, 0, 0, col - 32, false)));
  L.cabe(hCol + 12);
  cols.forEach(([t, xs, fondo, color], i) => {
    const x = M + i * (col + 12);
    L.caja(x, L.y, col, hCol, fondo, 16);
    L.fuente("d", 12.5, color);
    doc.text(t, x + 16, L.y + 26);
    listaVistos(L, xs, x + 16, L.y + 36, col - 32);
  });
  L.y += hCol + 12;

  // Pila de valor: lo que recibes además
  if (o.bonos.length) {
    L.fuente("c", 10.5);
    const filas = o.bonos.map((b) => Math.max(26, L.alto(b.t, W - 150, 10.5) + 12));
    const hB = 46 + filas.reduce((a, h) => a + h, 0) + (o.totalBonos ? 30 : 0);
    L.cabe(hB + 12);
    L.caja(M, L.y, W, hB, C.solSuave, 16);
    L.fuente("d", 12.5, C.solOscuro);
    doc.text("Además recibe", M + 16, L.y + 27);
    let yy = L.y + 40;
    o.bonos.forEach((b, i) => {
      L.caja(M + 16, yy + 1, 20, 20, C.sol, 7);
      L.fuente("d", 10, C.blanco);
      doc.text(String(i + 1), M + 26, yy + 15, { align: "center" });
      L.fuente("c", 10.5);
      L.texto(b.t, M + 46, yy + 1, W - 150, 10.5);
      if (b.valor) {
        L.fuente("cb", 10.5, C.solOscuro);
        doc.text(`valor ${fmtUSD(b.valor)}`, M + W - 16, yy + 15, { align: "right" });
      }
      yy += filas[i];
    });
    if (o.totalBonos) {
      L.fuente("d", 11.5, C.solOscuro);
      doc.text("Valor total de lo que recibe además", M + 16, yy + 18);
      doc.text(fmtUSD(o.totalBonos), M + W - 16, yy + 18, { align: "right" });
    }
    L.y += hB + 12;
  }

  // Desde cuándo · Mi garantía · Por qué ahora
  const tres: [string, string, RGB, RGB][] = [
    ["Desde cuándo", o.tiempo, C.fondo, C.violeta],
    ["Mi garantía", o.garantia, C.mentaSuave, C.menta],
    ["¿Por qué ahora?", o.urgencia, C.coralSuave, C.coral],
  ];
  const w3 = (W - 16) / 3;
  L.fuente("c", 9.5);
  const h3 = 40 + Math.max(...tres.map(([, t]) => L.alto(t, w3 - 28, 9.5, 1.3)));
  L.cabe(h3 + 12);
  tres.forEach(([t, cuerpo, fondo, color], i) => {
    const x = M + i * (w3 + 8);
    L.caja(x, L.y, w3, h3, fondo, 14);
    L.fuente("d", 11, color);
    doc.text(t, x + 14, L.y + 22);
    L.fuente("c", 9.5);
    L.texto(cuerpo, x + 14, L.y + 28, w3 - 28, 9.5, 1.3);
  });
  L.y += h3 + 12;

  // Inversión: en la propuesta, el precio en grande; en la primera reunión, la cita.
  if (n === 2 && o.inversion !== null) {
    const conBarras = o.totalBonos > 0;
    const hI = conBarras ? 132 : 84;
    L.cabe(hI + 12);
    L.caja(M, L.y, W, hI, C.tinta, 18);
    L.fuente("cb", 8.5, C.violetaSuave);
    doc.text("SU INVERSIÓN", M + 24, L.y + 30);
    L.fuente("d", 34, C.blanco);
    const precio = fmtUSD(o.inversion);
    doc.text(precio, M + 24, L.y + 66);
    const wp = doc.getTextWidth(precio);
    L.fuente("c", 11, C.violetaSuave);
    doc.text("al mes", M + 32 + wp, L.y + 66);
    L.fuente("c", 9.5, C.violetaSuave);
    doc.text(`Referencial (${VALIDAR})`, M + W - 24, L.y + 30, { align: "right" });
    if (conBarras) {
      const anual = o.inversion * 12;
      const max = Math.max(anual, o.totalBonos);
      const wb = W - 48 - 190 - 56;
      const filas: [string, number, RGB][] = [
        ["Valor de lo que recibe además", o.totalBonos, C.menta],
        ["Su inversión al año", anual, C.violetaMedio],
      ];
      filas.forEach(([t, v, color], i) => {
        const yy = L.y + 86 + i * 20;
        L.fuente("c", 9, C.violetaSuave);
        doc.text(t, M + 24, yy + 9);
        doc.setFillColor(60, 64, 104);
        doc.roundedRect(M + 190, yy, wb, 11, 5, 5, "F");
        doc.setFillColor(...color);
        doc.roundedRect(M + 190, yy, Math.max(12, (v / max) * wb), 11, 5, 5, "F");
        L.fuente("cb", 9, C.blanco);
        doc.text(fmtUSD(Math.round(v)), M + W - 24, yy + 9, { align: "right" });
      });
    }
    L.y += hI + 12;
  } else if (n === 1) {
    L.tarjeta(
      "La inversión, en nuestra segunda reunión",
      "Ahí le presento las opciones concretas con su precio, pensadas en lo que es importante para usted.",
      C.violetaSuave,
      C.violeta,
    );
  }
}

/* ---------- Informe 1: primera reunión ---------- */

function dibujarInforme1(L: Lienzo, inf: Informe) {
  L.encabezado(
    "Resumen de su primera reunión",
    `${inf.cliente || "Cliente"} · ${inf.tipo} · ${fmtFecha(inf.fecha)}`,
    lineaAsesor(inf),
    "PASO 1 DE 3 COMPLETADO",
    inf.asesor.nombreCompleto || inf.asesor.apodo,
  );
  L.camino(["Primera reunión: conocerle", "Segunda reunión: su propuesta", "Su plan en marcha"], 1);

  if (inf.resumen.length) {
    L.seccion("Su perfil", C.violeta, "1");
    L.datos(inf.resumen.slice(0, 6));
  }

  if (inf.dijo.length) {
    L.seccion("Lo que nos contó", C.coral, "“");
    for (const d of inf.dijo.slice(0, 3)) {
      L.fuente("c", 10.5);
      const h = L.alto(d, L.ancho - 30, 10.5) + 16;
      L.cabe(h + 6);
      L.caja(L.M, L.y, L.ancho, h, C.coralSuave, 12);
      L.doc.setFillColor(...C.coral);
      L.doc.roundedRect(L.M, L.y, 4, h, 2, 2, "F");
      L.fuente("c", 10.5);
      L.texto(d, L.M + 16, L.y + 6, L.ancho - 30, 10.5);
      L.y += h + 6;
    }
  }

  // Situación hoy: nivel + lista
  L.seccion("Su situación financiera hoy", C.menta, "+");
  const h = 40 + inf.proteccion.length * 22;
  L.cabe(h + 8);
  const izq = 150;
  L.caja(L.M, L.y, L.ancho, h, C.fondo, 14);
  L.fuente("d", 34, inf.nivel >= 70 ? C.menta : inf.nivel >= 40 ? [196, 128, 0] : C.coral);
  L.doc.text(`${inf.nivel}%`, L.M + 16, L.y + 48);
  L.fuente("c", 9, C.gris);
  L.texto("Nivel estimado con lo que nos contó", L.M + 16, L.y + 56, izq - 24, 9, 1.2);
  L.bateria(L.M + 16, L.y + h - 26, izq - 26, 12, inf.nivel);
  inf.proteccion.forEach((x, i) => {
    const yy = L.y + 24 + i * 22;
    L.icono(L.M + izq + 12, yy, x.estado);
    L.fuente("c", 10.5);
    L.doc.text(limpio(x.l), L.M + izq + 26, yy + 3.5);
    L.fuente("c", 9, C.gris);
    const t = x.estado === "si" ? "Listo" : x.estado === "no" ? "Pendiente" : x.estado === "parcial" ? "En camino" : "Por conversar";
    L.doc.text(t, L.W - L.M - 14, yy + 3.5, { align: "right" });
  });
  L.y += h + 8;

  if (inf.riesgos) dibujarRiesgos(L, inf.riesgos);

  if (inf.analisis.length) {
    L.seccion("Lo que vemos en su caso", C.violeta, "i");
    L.vinetas(inf.analisis.slice(0, 4));
  }

  // Estrategia
  L.seccion("Estrategia recomendada", C.violeta, "estrella");
  const e = inf.estrategia;
  const porque = e.porque.slice(0, 2);
  L.fuente("c", 10.5);
  const hE = 66 + porque.reduce((a, x) => a + L.alto(x, L.ancho - 54, 10.5) + 4, 0);
  L.cabe(hE + 10);
  L.caja(L.M, L.y, L.ancho, hE, C.violetaSuave, 16);
  L.fuente("cb", 8.5, C.blanco);
  const tipo = e.tipo.toUpperCase();
  const tw = L.doc.getTextWidth(tipo) + 18;
  L.caja(L.M + 16, L.y + 14, tw, 17, C.violeta, 8);
  L.fuente("cb", 8.5, C.blanco);
  L.doc.text(tipo, L.M + 25, L.y + 25.5);
  L.fuente("d", 14);
  L.doc.text(L.lineas(e.titulo, L.ancho - 32)[0], L.M + 16, L.y + 50);
  let yy = L.y + 58;
  for (const x of porque) {
    L.icono(L.M + 24, yy + 7, "ok");
    L.fuente("c", 10.5);
    yy += L.texto(x, L.M + 38, yy, L.ancho - 54, 10.5) + 4;
  }
  L.y += hE + 10;
  if (e.complementos.length) {
    L.sub("Cómo lo cuidamos:");
    L.vinetas(e.complementos.slice(0, 3), C.menta);
  }
  if (e.costoBeneficio.length) {
    L.sub("Cuidando su bolsillo:");
    L.vinetas(e.costoBeneficio.slice(0, 3), C.sol);
  }

  L.seccion("Próximos pasos", C.menta, "flecha");
  if (inf.segunda) L.tarjeta("Nuestra segunda reunión", `${inf.segunda}. Ahí le presento las opciones concretas.`, C.mentaSuave, C.menta);
  else L.vinetas(inf.pasos.slice(0, 2), C.menta);
  if (inf.pedidos.length) {
    L.sub("Para preparar su propuesta, le agradecería compartirme:");
    for (const x of inf.pedidos) {
      L.fuente("c", 10.5);
      const h2 = L.alto(x, L.ancho - 24, 10.5);
      L.cabe(h2 + 6);
      L.doc.setDrawColor(...C.violeta);
      L.doc.setLineWidth(1.4);
      L.doc.roundedRect(L.M, L.y + 2, 11, 11, 2, 2, "S");
      L.fuente("c", 10.5);
      L.texto(x, L.M + 20, L.y, L.ancho - 24, 10.5);
      L.y += h2 + 6;
    }
  }
  dibujarOferta(L, inf.oferta, 1);
  L.pie(NOTA_INFORME);
}

/* ---------- Resumen gráfico y bondades de cada plan (propuesta) ---------- */

const COLORES_TILE: [RGB, RGB][] = [
  [C.violetaSuave, C.violeta],
  [C.mentaSuave, C.menta],
  [C.solSuave, C.solOscuro],
  [C.coralSuave, C.coral],
];

function dibujarFichaPlan(L: Lienzo, x: ProductoPropuesta) {
  if (!x.destacados.length && !x.bondades.length) return;
  const { doc, M } = L;
  L.cabe(150);
  L.seccion(`Lo más importante de ${x.nombre}`, C.violeta, "estrella");

  // Resumen gráfico: tarjetas con el dato en grande
  if (x.destacados.length) {
    const cols = 4;
    const g = 8;
    const w = (L.ancho - g * (cols - 1)) / cols;
    for (let i = 0; i < x.destacados.length; i += cols) {
      const fila = x.destacados.slice(i, i + cols);
      const tam = (v: string) => {
        L.fuente("d", 15);
        return doc.getTextWidth(limpio(v)) <= w - 20 ? 15 : 11.5;
      };
      L.fuente("d", 11.5);
      const h = Math.max(...fila.map((d) => (tam(d.v) === 15 ? 18 : Math.min(3, L.lineas(d.v, w - 20).length) * 14))) + 44;
      L.cabe(h + g);
      fila.forEach((d, j) => {
        const [fondo, color] = COLORES_TILE[(i + j) % COLORES_TILE.length];
        const xx = M + j * (w + g);
        L.caja(xx, L.y, w, h, fondo, 12);
        doc.setFillColor(...color);
        doc.roundedRect(xx, L.y, w, 5, 2.5, 2.5, "F");
        L.fuente("cb", 7.5, C.gris);
        doc.text(limpio(d.l).toUpperCase(), xx + 10, L.y + 20, { maxWidth: w - 20 });
        const t = tam(d.v);
        L.fuente("d", t, color === C.solOscuro ? C.solOscuro : C.tinta);
        L.lineas(d.v, w - 20)
          .slice(0, 3)
          .forEach((l, k) => doc.text(l, xx + 10, L.y + 30 + t + k * 14));
      });
      L.y += h + g;
    }
  }

  // Bondades por grupo, con su fuente
  if (x.bondades.length) {
    L.y += 4;
    // El subtítulo nunca queda solo al pie: va con el primer grupo.
    L.cabe(90);
    L.sub("Bondades y beneficios que recibe");
    let grupo = "";
    for (const b of x.bondades) {
      const nombre = nombreCategoria(b.categoria);
      L.fuente("c", 10.5);
      const h = L.alto(b.t, L.ancho - 24, 10.5) + 12;
      if (nombre !== grupo) {
        L.cabe(h + 30);
        grupo = nombre;
        L.fuente("cb", 8.5, C.violeta);
        const wg = doc.getTextWidth(nombre.toUpperCase()) + 18;
        L.caja(M, L.y + 2, wg, 16, C.violetaSuave, 8);
        L.fuente("cb", 8.5, C.violeta);
        doc.text(nombre.toUpperCase(), M + 9, L.y + 13);
        L.y += 24;
      }
      L.cabe(h + 4);
      L.icono(M + 7, L.y + 7, "ok");
      L.fuente(b.dato ? "cb" : "c", 10.5);
      const ht = L.texto(b.t, M + 22, L.y, L.ancho - 24, 10.5);
      L.fuente("c", 7.5, C.gris);
      doc.text(limpio(b.fuente), M + 22, L.y + ht + 7);
      L.y += ht + 14;
    }
  }
  L.y += 4;
}

/* ---------- Vitality: mini sección si el plan lo tiene ---------- */



/* ---------- Cambio de seguro: lo que paga hoy vs. lo que pagará ---------- */

function dibujarComparativo(L: Lienzo, c: Comparativo) {
  const { doc, M } = L;
  const fondo = c.tipo === "inversion" ? C.violetaSuave : C.mentaSuave;
  const color = c.tipo === "inversion" ? C.violeta : C.menta;
  const gs = c.ganancias;
  L.fuente("c", 10.5);
  const hG = gs.reduce((a, g) => a + L.alto(g, L.ancho - 64, 10.5) + 5, 0);
  L.fuente("c", 11);
  const hM = L.alto(c.mensaje, L.ancho - 40, 11);
  const h = 52 + hM + (gs.length ? hG + 6 : 0) + 6;
  // Título, barras y tarjeta van juntos en la misma página.
  L.cabe(70 + 70 + h + 40);
  L.seccion("Lo que paga hoy vs. su nueva protección", color, "subir");

  // Barras: hoy y con la propuesta
  const max = Math.max(c.hoy, c.nuevo);
  const wb = L.ancho - 220;
  const filas: [string, number, RGB][] = [
    ["Paga hoy", c.hoy, C.linea],
    ["Con su nueva protección", c.nuevo, color],
  ];
  filas.forEach(([t, v, col], i) => {
    const y = L.y + i * 30;
    L.fuente(i ? "cb" : "c", 10, i ? C.tinta : C.gris);
    doc.text(t, M, y + 12);
    L.caja(M + 140, y + 2, wb, 16, C.fondo, 8);
    L.caja(M + 140, y + 2, Math.max(16, (v / max) * wb), 16, col, 8);
    L.fuente("d", 12, C.tinta);
    doc.text(`${fmtUSD(v)}/mes`, L.W - M, y + 14, { align: "right" });
  });
  L.y += 66;

  // El encuadre de valor: titular grande, mensaje y lo que gana
  L.caja(M, L.y, L.ancho, h, fondo, 18);
  L.fuente("d", 19, color);
  doc.text(L.lineas(c.titular, L.ancho - 40)[0], M + 20, L.y + 32);
  L.fuente("c", 11);
  let y = L.y + 46 + L.texto(c.mensaje, M + 20, L.y + 44, L.ancho - 40, 11) + 6;
  for (const g of gs) {
    L.icono(M + 28, y + 7, "ok");
    L.fuente("c", 10.5);
    y += L.texto(g, M + 42, y, L.ancho - 64, 10.5) + 5;
  }
  L.y += h + 10;

  // Datos de apoyo en pastillas
  const chips: string[] = [];
  if (c.tipo === "ahorro") chips.push(`${fmtUSD(c.anual)} al año a su favor`);
  if (c.tipo === "inversion") chips.push(`${fmtUSD(c.porDia)} al día`);
  if (c.prestaciones) chips.push(`${c.prestaciones} coberturas y beneficios`);
  if (c.prestaciones && c.nuevo) chips.push(`${fmtUSD(Math.round((c.nuevo / c.prestaciones) * 100) / 100)} al mes por cada una`);
  if (chips.length) L.chips(chips, fondo, color);
}

/* ---------- Proyección del plan en tres escenarios ---------- */

function dibujarProyeccion(L: Lienzo, x: Proyeccion) {
  L.seccion(`Su proyección a ${x.anios} años`, C.menta, "subir");
  const claves = Object.keys(ESCENARIOS_L) as (keyof Escenarios)[];
  const colores: RGB[] = [C.gris, C.violeta, C.menta];
  const tope = Math.max(x.final.optimista, x.final.aportado, x.meta ?? 0) || 1;
  const filas: [string, number, RGB][] = [
    ["Lo que aporta", x.final.aportado, C.coral],
    ...claves.map((k, i): [string, number, RGB] => [`${ESCENARIOS_L[k]} (${x.tasas[k]}% anual)`, x.final[k], colores[i]]),
  ];
  const h = 26 + filas.length * 26 + (x.meta ? 20 : 0);
  L.cabe(h + 8);
  L.caja(L.M, L.y, L.ancho, h, C.fondo, 14);
  const izq = 170;
  const anchoB = L.ancho - izq - 110;
  filas.forEach(([l, v, col], i) => {
    const yy = L.y + 22 + i * 26;
    L.fuente("c", 10);
    L.doc.text(limpio(l), L.M + 14, yy + 4);
    L.doc.setFillColor(...col);
    L.doc.roundedRect(L.M + izq, yy - 5, Math.max(4, (v / tope) * anchoB), 12, 4, 4, "F");
    L.fuente("cb", 10.5);
    L.doc.text(fmtUSD(Math.round(v)), L.W - L.M - 14, yy + 4, { align: "right" });
  });
  if (x.meta) {
    L.fuente("c", 9.5, C.gris);
    const ok = x.alcanza && x.alcanza.moderado;
    L.doc.text(limpio(`Su meta: ${fmtUSD(x.meta)}${ok ? " · el escenario moderado la alcanza" : ""}`), L.M + 14, L.y + h - 12);
  }
  L.y += h + 8;
  L.fuente("c", 8.5, C.gris);
  const hN = L.alto(AVISO_PROYECCION, L.ancho, 8.5);
  L.cabe(hN + 6);
  L.texto(AVISO_PROYECCION, L.M, L.y, L.ancho, 8.5);
  L.y += hN + 8;
}

/* ---------- Informe 2: segunda reunión (propuesta) ---------- */

function dibujarPropuesta(L: Lienzo, pr: Propuesta) {
  L.encabezado(
    "Su propuesta de inversión",
    `${pr.cliente || "Cliente"} · ${pr.tipo} · ${fmtFecha(pr.fecha)}`,
    lineaAsesor(pr),
    "PASO 2 DE 3 COMPLETADO",
    pr.asesor.nombreCompleto || pr.asesor.apodo,
  );
  L.camino(["Primera reunión: conocerle", "Segunda reunión: su propuesta", "Su decisión y su plan"], 2);

  if (pr.busca.length) {
    L.seccion("Lo que busca", C.coral, "“");
    for (const b of pr.busca) {
      L.fuente("s", 12);
      const h = L.alto(`“${b}”`, L.ancho - 36, 12) + 20;
      L.cabe(h + 6);
      L.caja(L.M, L.y, L.ancho, h, C.coralSuave, 14);
      L.fuente("s", 12, C.tinta);
      L.texto(`“${b}”`, L.M + 18, L.y + 8, L.ancho - 36, 12);
      L.y += h + 6;
    }
  }

  L.seccion("Su propuesta", C.violeta, "estrella");
  if (!pr.productos.length)
    L.tarjeta("En preparación", "Le comparto el detalle de los planes en cuanto confirmemos las opciones.", C.fondo, C.violeta);
  for (const x of pr.productos) {
    L.fuente("c", 10);
    const cobH = x.coberturas.reduce((a, c) => a + L.alto(c, L.ancho - 210, 10, 1.25) + 6, 0);
    const h = Math.max(100, 50 + cobH);
    L.cabe(h + 10);
    L.caja(L.M, L.y, L.ancho, h, C.violetaSuave, 16);
    // Precio
    L.caja(L.M + 12, L.y + 12, 150, h - 24, C.violeta, 12);
    const precio = x.mensual !== null ? fmtUSD(x.mensual) : "—";
    L.fuente("d", precio.length > 7 ? 20 : 26, C.blanco);
    L.doc.text(precio, L.M + 87, L.y + h / 2 + 2, { align: "center" });
    L.fuente("c", 9.5, C.violetaSuave);
    L.doc.text(pr.plan?.tipo === "Contribución única" ? "aporte único" : "al mes", L.M + 87, L.y + h / 2 + 18, { align: "center" });
    if (pr.plan?.plazo) {
      L.fuente("c", 8.5, C.violetaSuave);
      L.doc.text(`Plazo ${pr.plan.plazo} años`, L.M + 87, L.y + h / 2 + 32, { align: "center" });
    }
    // Nombre y coberturas
    const xx = L.M + 178;
    L.fuente("d", 13.5);
    L.doc.text(L.lineas(x.nombre, L.ancho - 196)[0], xx, L.y + 30);
    let yy = L.y + 40;
    if (!x.coberturas.length) {
      L.fuente("c", 9.5, C.gris);
      L.texto(pr.plan?.tipo ? `${pr.plan.tipo}. Fondos y costos según las condiciones del plan: se los detallo con el documento oficial.` : "Fondos y costos según las condiciones del plan: se los detallo con el documento oficial.", xx, yy, L.ancho - 196, 9.5);
    }
    for (const c of x.coberturas) {
      L.icono(xx + 6, yy + 7, "ok");
      L.fuente("c", 10);
      yy += L.texto(c, xx + 18, yy, L.ancho - 210, 10, 1.25) + 6;
    }
    L.y += h + 10;
  }
  if (pr.productos.length > 1 && pr.total !== null) {
    L.cabe(34);
    L.caja(L.M, L.y, L.ancho, 30, C.fondo, 12);
    L.fuente("cb", 11);
    L.doc.text("Total al mes", L.M + 14, L.y + 19.5);
    L.fuente("d", 13, C.violeta);
    L.doc.text(fmtUSD(pr.total), L.W - L.M - 14, L.y + 20, { align: "right" });
    L.y += 40;
  }
  if (pr.comparativo) dibujarComparativo(L, pr.comparativo);
  if (pr.poliza) {
    L.seccion(pr.poliza.titulo, C.sol, "i");
    L.vinetas(pr.poliza.puntos, C.sol);
  }
  if (pr.proyeccion) dibujarProyeccion(L, pr.proyeccion);
  for (const x of pr.productos) dibujarFichaPlan(L, x);

  if (pr.gana.length) {
    L.seccion(pr.tipo === "Ya invierte" ? "Lo que gana frente a su inversión actual" : "Lo que gana", C.menta, "subir");
    L.vinetas(pr.gana, C.menta);
  }

  if (pr.objeciones.length) {
    // El título va con su primera pregunta, nunca solo al pie.
    L.cabe(160);
    L.seccion("Preguntas frecuentes", C.violeta, "?");
    for (const o of pr.objeciones) {
      L.fuente("c", 10.5);
      const hR = L.alto(o.respuesta, L.ancho - 32, 10.5);
      L.fuente("c", 9);
      const hA = o.apoyo ? L.alto(`Además: ${o.apoyo}`, L.ancho - 32, 9) + 6 : 0;
      const h = 44 + hR + hA;
      L.cabe(h + 8);
      L.caja(L.M, L.y, L.ancho, h, C.fondo, 14);
      L.fuente("d", 11, C.violeta);
      L.doc.text(L.lineas(o.titulo, L.ancho - 32)[0], L.M + 16, L.y + 25);
      L.fuente("c", 10.5);
      L.texto(o.respuesta, L.M + 16, L.y + 36, L.ancho - 32, 10.5);
      if (o.apoyo) {
        L.fuente("c", 9, C.gris);
        L.texto(`Además: ${o.apoyo}`, L.M + 16, L.y + 40 + hR, L.ancho - 32, 9);
      }
      L.y += h + 8;
    }
  }

  if (pr.riesgos) {
    dibujarRiesgos(L, pr.riesgos, false);
    L.tarjeta("Por qué le importa", pr.riesgos.argumento, C.solSuave, C.solOscuro);
  }

  L.seccion("Siguientes pasos", C.menta, "flecha");
  L.vinetas(pr.pasos, C.menta);
  dibujarOferta(L, pr.oferta, 2);
  L.pie(NOTA_PROPUESTA);
}

/** Arma el PDF (con las fuentes dadas, o Helvetica si faltan). */
export async function armarPDF(inf: InformeReunion, fuentes: Fuentes | null, foto: string | null = null): Promise<JsPDF> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const L = new Lienzo(doc, fuentes, foto);
  if (inf.n === 2) dibujarPropuesta(L, inf);
  else dibujarInforme1(L, inf);
  return doc;
}

/** `foto`: la foto del asesor lista para el PDF (ver fotoParaPDF), o null. */
export async function informePDF(inf: InformeReunion, foto: string | null = null): Promise<File> {
  const doc = await armarPDF(inf, await cargarFuentes(), foto);
  return new File([doc.output("blob")], nombreArchivoInforme(inf), { type: "application/pdf" });
}
