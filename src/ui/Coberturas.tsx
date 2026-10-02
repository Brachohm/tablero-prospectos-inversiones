/**
 * Tabla de coberturas (plan actual de la persona o plan de la Biblioteca) y
 * la comparación para un cambio de seguro: plan recomendado, lo que gana, lo
 * que debe saber y el detalle concepto por concepto.
 */
import { agregarProducto } from "../domain/cierre";
import { sinEmojis } from "../domain/texto";
import { useId, useRef, useState } from "react";
import { CONCEPTOS } from "../config/coberturas";
import { VALIDAR } from "../config/saludsa";
import type { Documento } from "../domain/biblioteca";
import {
  avisos,
  beneficios,
  conceptosLlenos,
  primaActualDe,
  recomendarPlanes,
  tablaDe,
  tablaDesdeFilas,
  tablaDesdeTexto,
  textoComparacion,
  type AnalisisPlan,
  type Resultado,
  type TablaCoberturas,
} from "../domain/comparar";
import { numeroWhatsApp, txt } from "../domain/ficha";
import { fmtUSD } from "../domain/oferta";
import type { Prospecto } from "../domain/tipos";
import { useBiblioteca } from "../store/biblioteca";
import { useAviso, useEnlaces } from "./hooks";
import { ir } from "./router";

/** Une lo encontrado con lo que ya había: no pisa lo escrito a mano. */
function unir(antes: TablaCoberturas, nuevo: TablaCoberturas): [TablaCoberturas, number] {
  const t = { ...antes };
  let n = 0;
  for (const [k, v] of Object.entries(nuevo) as [keyof TablaCoberturas, string][])
    if (v && !t[k]?.trim()) {
      t[k] = v;
      n++;
    }
  return [t, n];
}

export function EditorTabla({
  tabla,
  set,
  titulo,
  docs = [],
  alArchivo,
}: {
  tabla: TablaCoberturas;
  set: (t: TablaCoberturas) => void;
  titulo: string;
  /** Documentos de la Biblioteca para llenar la tabla desde su texto. */
  docs?: readonly Documento[];
  alArchivo?: (nombre: string) => void;
}) {
  const avisar = useAviso();
  const base = useId();
  const input = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [pegar, setPegar] = useState(false);
  const [texto, setTexto] = useState("");

  const aplicar = (nuevo: TablaCoberturas, origen: string) => {
    const [t, n] = unir(tabla, nuevo);
    set(t);
    avisar(n ? `Encontré ${n} ${n === 1 ? "concepto" : "conceptos"} en ${origen}: revísalos` : `No encontré conceptos nuevos en ${origen}`);
  };

  const cargar = async (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f) return;
    setLeyendo(true);
    try {
      if (/\.pdf$/i.test(f.name) || f.type === "application/pdf") {
        const { textoDePDF } = await import("./pdf");
        aplicar(tablaDesdeTexto((await textoDePDF(await f.arrayBuffer())).join("\n")), f.name);
      } else {
        const { leerHoja } = await import("./excel");
        aplicar(tablaDesdeFilas(await leerHoja(f)), f.name);
      }
      alArchivo?.(f.name);
    } catch {
      avisar("No pude leer ese archivo. Usa Excel, CSV o un PDF con texto");
    } finally {
      setLeyendo(false);
    }
  };

  const llenos = conceptosLlenos(tabla).length;

  return (
    <div className="tabla-cob" role="group" aria-label={titulo}>
      <div className="tc-cargar">
        <button type="button" className="btn small" disabled={leyendo} onClick={() => input.current?.click()}>
          {leyendo ? "Leyendo…" : "📄 Cargar Excel, CSV o PDF"}
        </button>
        <button type="button" className="btn ghost small" aria-expanded={pegar} onClick={() => setPegar(!pegar)}>
          Pegar texto
        </button>
        {docs.length > 0 && (
          <select
            aria-label="Llenar desde un documento de la Biblioteca"
            value=""
            onChange={(e) => {
              const d = docs.find((x) => x.id === e.target.value);
              if (d) aplicar(tablaDesdeTexto(d.paginas.join("\n")), d.nombre);
            }}
          >
            <option value="">Desde la Biblioteca…</option>
            {docs.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
        )}
        <input
          ref={input}
          type="file"
          hidden
          aria-label={`Archivo para ${titulo}`}
          accept=".xlsx,.csv,.pdf,application/pdf,text/csv"
          onChange={(e) => void cargar(e.target.files?.[0])}
        />
      </div>
      {pegar && (
        <div className="f" style={{ marginTop: 8 }}>
          <label htmlFor={base + "pegar"}>
            <span>Pega la tabla (una cobertura por línea)</span>
          </label>
          <textarea id={base + "pegar"} rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
          <button
            type="button"
            className="btn small"
            onClick={() => {
              aplicar(tablaDesdeTexto(texto), "el texto");
              setTexto("");
              setPegar(false);
            }}
          >
            Reconocer
          </button>
        </div>
      )}
      <p className="an-note">
        {llenos} de {CONCEPTOS.length} conceptos. Escribe montos ($5.000), porcentajes (80%), días o “No incluye”.
      </p>
      <div className="tc-filas">
        {CONCEPTOS.map((c) => (
          <div key={c.id} className="tc-fila">
            <label htmlFor={base + c.id}>{c.l}</label>
            <input
              id={base + c.id}
              value={tabla[c.id] ?? ""}
              placeholder={c.ph}
              onChange={(e) => set({ ...tabla, [c.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const ICONO: Record<Resultado, string> = { mejor: "✅", peor: "⚠️", igual: "＝", "?": "·" };

/** Sección de la ficha de cambio de seguro. */
export function ComparacionPlan({ p, actualizar }: { p: Prospecto; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const enl = useEnlaces();
  const { planes } = useBiblioteca();
  const avisar = useAviso();
  const actual = tablaDe(p.planActual?.tabla);
  const llenos = conceptosLlenos(actual).length;
  const [editar, setEditar] = useState(llenos === 0);
  const ranking = llenos ? recomendarPlanes(p, actual, planes) : [];
  const [elegido, setElegido] = useState<string | null>(null);
  const a = ranking.find((x) => x.plan.id === elegido) ?? ranking[0];
  const pa = primaActualDe(p, actual);

  const set = (t: TablaCoberturas) =>
    actualizar((x) => ({ ...x, planActual: { ...(x.planActual ?? {}), tabla: t } }));

  const copiar = async (t: string) => {
    try {
      await navigator.clipboard.writeText(sinEmojis(t));
      avisar("Comparación copiada");
    } catch {
      avisar("No se pudo copiar");
    }
  };

  const llevar = (x: AnalisisPlan) => {
    const gana = beneficios(x).slice(0, 6).join("; ");
    // Se suma a los planes ya elegidos para la propuesta (sin duplicarlo).
    actualizar((f) => agregarProducto({ ...f, ...(txt(f, "gana") ? {} : { gana }) }, x.plan, x.primaPlan));
    avisar(`${x.plan.nombre} se sumó a la propuesta y al pre-cierre${txt(p, "gana") ? "" : " (con lo que gana)"}`);
  };

  const wa = numeroWhatsApp(p);

  return (
    <section className="miss comparar" aria-labelledby="t-comparar" id="comparar">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          ⚖️
        </span>
        <h2 id="t-comparar">Su plan actual vs. tus planes</h2>
        <span className="mp">{llenos} conceptos</span>
      </div>
      <p className="an-note">
        Carga la tabla de coberturas de su plan actual. La comparo con las tablas de tus planes de la Biblioteca y te
        recomiendo uno según lo que paga hoy, su presupuesto y sus motivos de inconformidad.
      </p>

      {editar ? (
        <>
          <EditorTabla
            tabla={actual}
            set={set}
            titulo="Tabla de coberturas del plan actual"
            alArchivo={(n) => actualizar((x) => ({ ...x, planActual: { ...(x.planActual ?? { tabla: {} }), archivo: n } }))}
          />
          {llenos > 0 && (
            <button type="button" className="btn small" style={{ marginTop: 10 }} onClick={() => setEditar(false)}>
              Ver la comparación
            </button>
          )}
        </>
      ) : (
        <button type="button" className="btn ghost small" onClick={() => setEditar(true)}>
          ✏️ Editar su plan actual{p.planActual?.archivo ? ` (${p.planActual.archivo})` : ""}
        </button>
      )}

      {llenos > 0 && !editar && (
        <>
          {!ranking.length ? (
            <p className="an-status warn" style={{ marginTop: 12 }}>
              Ningún plan de tu Biblioteca tiene su tabla de coberturas.{" "}
              <button type="button" className="enlace" onClick={() => ir({ v: "biblioteca", sec: "planes" })}>
                Llénalas en Planes
              </button>{" "}
              para poder comparar.
            </p>
          ) : (
            a && (
              <>
                {ranking.length > 1 && (
                  <div className="chips" role="group" aria-label="Planes comparados" style={{ marginTop: 12 }}>
                    {ranking.map((x, i) => (
                      <button key={x.plan.id} className="chip" aria-pressed={x.plan.id === a.plan.id} onClick={() => setElegido(x.plan.id)}>
                        {i === 0 ? "⭐ " : ""}
                        {x.plan.nombre}
                      </button>
                    ))}
                  </div>
                )}
                <div className={"rec-plan" + (a === ranking[0] ? " destacado" : "")}>
                  <span className="vl">{a === ranking[0] ? "⭐ Recomendado" : "Alternativa"}</span>
                  <h3>{a.plan.nombre}</h3>
                  <p className="precio">
                    {a.primaPlan !== null ? `${fmtUSD(a.primaPlan)} al mes` : "Precio por confirmar"}
                    {pa !== null && a.diferencia !== null && (
                      <span className={a.diferencia > 0 ? "mas" : "menos"}>
                        {a.diferencia === 0
                          ? " · igual a lo que paga hoy"
                          : ` · ${a.diferencia > 0 ? "+" : "−"}${fmtUSD(Math.abs(a.diferencia))} frente a hoy (${fmtUSD(pa)})`}
                      </span>
                    )}
                  </p>
                  <p className="an-note">
                    {a.mejoras} mejoras · {a.peores} {a.peores === 1 ? "punto en contra" : "puntos en contra"}
                    {a.fueraPresupuesto && " · supera su presupuesto"}
                  </p>
                  {beneficios(a).length > 0 && (
                    <div className="an-sec busca">
                      <h3>
                        <i />
                        Lo que gana
                      </h3>
                      <ul className="an-list">
                        {beneficios(a).map((b, i) => (
                          <li key={i}>✅ {b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {avisos(a).length > 0 && (
                    <div className="an-sec evita">
                      <h3>
                        <i />
                        Que lo sepa antes de decidir
                      </h3>
                      <ul className="an-list">
                        {avisos(a).map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <details className="cmp-detalle">
                    <summary>Concepto por concepto</summary>
                    <table>
                      <thead>
                        <tr>
                          <th>Concepto</th>
                          <th>Hoy</th>
                          <th>{a.plan.nombre}</th>
                          <th aria-label="Resultado" />
                        </tr>
                      </thead>
                      <tbody>
                        {a.filas.map((f) => (
                          <tr key={f.id} className={"r-" + (f.res === "?" ? "nd" : f.res)}>
                            <td>
                              {f.l}
                              {f.clave && <small> · su motivo</small>}
                            </td>
                            <td>{f.actual || "—"}</td>
                            <td>{f.plan || "—"}</td>
                            <td aria-label={f.res === "?" ? "sin comparar" : f.res}>{ICONO[f.res]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </details>
                  <p className="an-note">Según lo que cargaste: {VALIDAR} antes de presentarlo.</p>
                  <div className="envio">
                    <button className="btn" onClick={() => llevar(a)}>
                      Usar en la propuesta
                    </button>
                    <button className="btn ghost" onClick={() => void copiar(textoComparacion(p, a))}>
                      Copiar
                    </button>
                    {wa && (
                      <a
                        className="btn wa-btn"
                        {...enl.wa(wa, textoComparacion(p, a))}
                        rel="noopener noreferrer"
                      >
                        💬 Enviar
                      </a>
                    )}
                  </div>
                </div>
              </>
            )
          )}
        </>
      )}
    </section>
  );
}
