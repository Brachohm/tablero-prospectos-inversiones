/**
 * Biblioteca: el material oficial que el asesor carga (condiciones
 * generales, anexos de planes), con búsqueda sin conexión; el catálogo de
 * planes y los argumentos de venta. Todo vive solo en este dispositivo.
 */
import { sinEmojis } from "../domain/texto";
import { useId, useRef, useState, type ReactNode } from "react";
import { ETIQUETAS_ARGUMENTO, TIPOS_DOC } from "../config/biblioteca";
import { VALIDAR } from "../config/saludsa";
import {
  buscar,
  CAMPOS_PLAN,
  crearArgumento,
  crearPlan,
  lineas,
  paginarTexto,
  resaltar,
  type Argumento,
  type Documento,
  type Plan,
  type TipoDoc,
} from "../domain/biblioteca";
import { nuevoId } from "../domain/ficha";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { BotonConfirmar } from "./comunes";
import { useArgumentos, useAviso } from "./hooks";
import { esAuto, ORIGEN_AUTO_L } from "../domain/aprender";
import { ajustesIniciales } from "../domain/ajustes";
import { EditorTabla } from "./Coberturas";
import { conceptosLlenos, type TablaCoberturas } from "../domain/comparar";
import { aplicarPrecarga, precargaDesdeDocumento, totalPrecarga, type Precarga } from "../domain/extraer";
import { ir, volver, type SeccionBiblioteca } from "./router";

const ETIQUETA_L: Readonly<Record<string, string>> = Object.fromEntries(ETIQUETAS_ARGUMENTO.map((e) => [e.id, e.l]));
const TIPO_DOC_L: Readonly<Record<string, string>> = Object.fromEntries(TIPOS_DOC.map((t) => [t.id, t.l]));

export function BibliotecaVista({ sec }: { sec: SeccionBiblioteca }) {
  const b = useBiblioteca();
  const { sistema } = useArgumentos();
  // Argumento en edición (también se crea desde un resultado de búsqueda).
  const [borrador, setBorrador] = useState<Argumento | null>(null);
  // Plan precargado desde un PDF, para revisarlo antes de guardar.
  const [precargado, setPrecargado] = useState<PlanPrecargado | null>(null);
  const avisar = useAviso();
  const precargar = (d: Documento, auto = false) => {
    const x = precargaDesdeDocumento(d);
    if (!totalPrecarga(x)) {
      if (!auto) avisar("No encontré coberturas, carencias ni valores en ese documento: no invento nada, llena el plan a mano");
      return;
    }
    const nombre = (d.plan || d.nombre).trim();
    const existente = b.planes.find((p) => p.nombre.trim().toLowerCase() === nombre.toLowerCase());
    setPrecargado({ plan: aplicarPrecarga(existente ?? crearPlan(), x, d), x, existente: !!existente });
    ir({ v: "biblioteca", sec: "planes" }, { reemplazar: true });
    avisar(`Precargué el plan con ${totalPrecarga(x)} datos del PDF: revísalo y guárdalo`);
  };
  const secciones: [SeccionBiblioteca, string, number][] = [
    ["docs", "Documentos", b.docs.length],
    ["planes", "Planes", b.planes.length],
    ["argumentos", "Argumentos", b.argumentos.length + sistema.length],
  ];
  const aArgumento = (a: Argumento) => {
    setBorrador(a);
    ir({ v: "biblioteca", sec: "argumentos" }, { reemplazar: true });
  };
  return (
    <div className="wrap page-top">
      <div className="top">
        <button className="back" onClick={() => volver()} aria-label="Volver">
          ←
        </button>
        <div className="who">
          <b>Biblioteca</b>
          <small>Alimenta los análisis, ofertas e informes</small>
        </div>
      </div>
      <p className="an-note">
        De aquí se alimenta el sistema: condiciones generales, fichas de los planes y de los fondos, y tus
        argumentos. Con esto se arman los análisis, la comparación de planes, las ofertas y los informes. Vive solo en
        este dispositivo; confirma costos, rescates y fondos con el material vigente.
      </p>
      <div className="tabs tres" role="tablist" aria-label="Secciones de la biblioteca">
        {secciones.map(([id, l, n]) => (
          <button
            key={id}
            role="tab"
            className="tab"
            aria-selected={sec === id}
            onClick={() => ir({ v: "biblioteca", sec: id }, { reemplazar: true })}
          >
            {l} {n > 0 && <span className="cnt">{n}</span>}
          </button>
        ))}
      </div>
      {!b.listo ? (
        <p className="an-note" role="status">
          Cargando…
        </p>
      ) : sec === "docs" ? (
        <Documentos docs={b.docs} aArgumento={aArgumento} precargar={precargar} />
      ) : sec === "planes" ? (
        <Planes planes={b.planes} precargado={precargado} alUsarPrecargado={() => setPrecargado(null)} />
      ) : (
        <Argumentos args={b.argumentos} borrador={borrador} setBorrador={setBorrador} />
      )}
    </div>
  );
}

/* ---------- Documentos ---------- */

async function abrirArchivo(d: Documento, pagina?: number) {
  // Se abre la pestaña antes de leer (si no, el navegador la bloquea).
  const w = window.open("", "_blank");
  const blob = await biblioteca.archivo(d.id);
  if (!blob) {
    w?.close();
    return false;
  }
  const url = URL.createObjectURL(blob) + (pagina ? `#page=${pagina}` : "");
  if (w) w.location.href = url;
  else {
    // Ventanas bloqueadas: se descarga.
    const a = document.createElement("a");
    a.href = url;
    a.download = d.nombre + ".pdf";
    a.click();
  }
  return true;
}

function Documentos({
  docs,
  aArgumento,
  precargar,
}: {
  docs: Documento[];
  aArgumento: (a: Argumento) => void;
  precargar: (d: Documento, auto?: boolean) => void;
}) {
  const avisar = useAviso();
  const [q, setQ] = useState("");
  const [cargar, setCargar] = useState(false);
  const res = buscar(docs, q);
  const porId = new Map(docs.map((d) => [d.id, d] as const));
  const idBuscar = useId();
  return (
    <>
      {docs.length > 0 && (
        <div className="f buscar">
          <label htmlFor={idBuscar}>
            <span>Buscar en tus documentos</span>
          </label>
          <input
            id={idBuscar}
            type="search"
            value={q}
            placeholder="rescate, costo de administración, fondo conservador…"
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}
      {q.trim() && (
        <section className="resultados" aria-label="Resultados">
          <p className="an-note">
            {res.length ? `${res.length === 30 ? "30+" : res.length} coincidencias` : "Sin coincidencias: prueba con otra palabra."}
          </p>
          {res.map((r) => {
            const d = porId.get(r.docId);
            return (
              <article key={r.docId + r.pagina} className="res">
                <h3>
                  {r.doc} <small>· pág. {r.pagina}</small>
                </h3>
                <p>
                  {resaltar(r.fragmento, q).map((x, i) => (x.m ? <mark key={i}>{x.t}</mark> : <span key={i}>{x.t}</span>))}
                </p>
                <div className="res-acc">
                  <button
                    type="button"
                    className="btn ghost small"
                    onClick={() =>
                      aArgumento(
                        crearArgumento(Date.now(), {
                          texto: r.fragmento.replace(/^…|…$/g, ""),
                          fuente: `${r.doc}, pág. ${r.pagina}`,
                          etiquetas: ["general"],
                        }),
                      )
                    }
                  >
                    Guardar como argumento
                  </button>
                  {d?.archivo && (
                    <button
                      type="button"
                      className="btn ghost small"
                      onClick={() => void abrirArchivo(d, r.pagina).then((ok) => ok || avisar("No se encontró el PDF"))}
                    >
                      Abrir PDF
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {cargar ? (
        <CargarDocumento
          alTerminar={(d) => {
            setCargar(false);
            // Anexos, condiciones y tarifas: se precarga el plan con lo que dice el PDF.
            if (d && d.tipo !== "otro") precargar(d, true);
          }}
        />
      ) : (
        <div className="actions">
          <button className="btn" onClick={() => setCargar(true)}>
            + Cargar documento
          </button>
        </div>
      )}

      <h2 className="sec">Tus documentos</h2>
      {docs.length === 0 ? (
        <div className="empty">
          <b>Aún no hay documentos</b>
          Carga las condiciones generales y los anexos de cada plan (PDF). Podrás buscar en ellos sin conexión y guardar
          lo que te sirva como argumento.
        </div>
      ) : (
        <div className="list">
          {[...docs]
            .sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nombre.localeCompare(b.nombre))
            .map((d) => {
              const sinTexto = d.paginas.every((x) => !x.trim());
              return (
                <div key={d.id} className="doc">
                  <div>
                    <h3>{d.nombre}</h3>
                    <div className="tags">
                      <span className="tag">{TIPO_DOC_L[d.tipo] ?? d.tipo}</span>
                      {d.plan && <span className="tag t-cambio">{d.plan}</span>}
                    </div>
                    <p>
                      {d.paginas.length} {d.paginas.length === 1 ? "página" : "páginas"}
                      {d.archivo ? ` · ${(d.bytes / 1048576).toFixed(1)} MB` : " · texto pegado"}
                    </p>
                    {sinTexto && (
                      <p className="an-status warn">
                        Este PDF no tiene texto (parece escaneado): no se puede buscar en él. Pega el texto a mano.
                      </p>
                    )}
                  </div>
                  <div className="doc-acc">
                    {!sinTexto && (
                      <button type="button" className="btn ghost small" onClick={() => precargar(d)}>
                        Precargar plan
                      </button>
                    )}
                    {d.archivo && (
                      <button
                        type="button"
                        className="btn ghost small"
                        onClick={() => void abrirArchivo(d).then((ok) => ok || avisar("No se encontró el PDF"))}
                      >
                        Abrir
                      </button>
                    )}
                    <BotonConfirmar
                      className="btn ghost small"
                      armadoTexto="¿Borrar?"
                      aria-label={`Borrar ${d.nombre}`}
                      onConfirm={() => {
                        void biblioteca.borrar("docs", d.id);
                        avisar("Documento borrado");
                      }}
                    >
                      Borrar
                    </BotonConfirmar>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </>
  );
}

function CargarDocumento({ alTerminar }: { alTerminar: (d?: Documento) => void }) {
  const avisar = useAviso();
  const [tipo, setTipo] = useState<TipoDoc>("condiciones");
  const [plan, setPlan] = useState("");
  const [modo, setModo] = useState<"pdf" | "texto">("pdf");
  const [nombre, setNombre] = useState("");
  const [texto, setTexto] = useState("");
  const [avance, setAvance] = useState<string | null>(null);
  const archivo = useRef<HTMLInputElement>(null);
  const ids = { tipo: useId(), plan: useId(), nombre: useId(), texto: useId() };

  const base = (n: string, paginas: string[], extra: Partial<Documento> = {}): Documento => {
    const ahora = Date.now();
    return {
      id: nuevoId(ahora),
      nombre: n,
      tipo,
      plan: plan.trim(),
      paginas,
      archivo: false,
      bytes: 0,
      creado: ahora,
      mod: ahora,
      ...extra,
    };
  };

  const subirPDF = async (f: File | undefined) => {
    if (!f) return;
    setAvance("Leyendo el PDF…");
    try {
      const { textoDePDF } = await import("./pdf");
      const paginas = await textoDePDF(await f.arrayBuffer(), (i, n) => setAvance(`Leyendo página ${i} de ${n}…`));
      const d = base(nombre.trim() || f.name.replace(/\.pdf$/i, ""), paginas, { archivo: true, bytes: f.size });
      await biblioteca.agregarDoc(d, f);
      avisar(paginas.some((x) => x.trim()) ? `Documento cargado: ${paginas.length} páginas` : "Cargado, pero el PDF no tiene texto");
      alTerminar(d);
    } catch {
      setAvance(null);
      avisar("No se pudo leer ese PDF");
    } finally {
      if (archivo.current) archivo.current.value = "";
    }
  };

  const guardarTexto = async () => {
    if (!nombre.trim() || !texto.trim()) return avisar("Pon un nombre y pega el texto");
    const d = base(nombre.trim(), paginarTexto(texto));
    await biblioteca.agregarDoc(d);
    avisar("Documento guardado");
    alTerminar(d);
  };

  return (
    <section className="miss" aria-label="Cargar documento">
      <h2 className="sub-h">Cargar documento</h2>
      <div className="two">
        <div className="f">
          <label htmlFor={ids.tipo}>
            <span>Tipo</span>
          </label>
          <select id={ids.tipo} value={tipo} onChange={(e) => setTipo(e.target.value as TipoDoc)}>
            {TIPOS_DOC.map((t) => (
              <option key={t.id} value={t.id}>
                {t.l}
              </option>
            ))}
          </select>
        </div>
        <div className="f">
          <label htmlFor={ids.plan}>
            <span>Plan (si es un anexo)</span>
          </label>
          <input id={ids.plan} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Opcional" />
        </div>
        <div className="f full">
          <label htmlFor={ids.nombre}>
            <span>Nombre</span>
          </label>
          <input
            id={ids.nombre}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder={modo === "pdf" ? "Si lo dejas vacío, se usa el nombre del archivo" : "Condiciones generales 2026"}
          />
        </div>
      </div>
      <div className="chips" role="group" aria-label="Cómo cargarlo" style={{ margin: "4px 0 12px" }}>
        <button type="button" className="chip" aria-pressed={modo === "pdf"} onClick={() => setModo("pdf")}>
          Archivo PDF
        </button>
        <button type="button" className="chip" aria-pressed={modo === "texto"} onClick={() => setModo("texto")}>
          Pegar texto
        </button>
      </div>
      {modo === "pdf" ? (
        <>
          <p className="an-note">
            El texto se lee aquí mismo, sin internet. El PDF queda guardado para abrirlo después. Si es un anexo,
            condiciones o tarifas, se precarga el plan solo con lo que dice el documento.
          </p>
          {avance && (
            <p className="an-status" role="status">
              {avance}
            </p>
          )}
          <div className="actions">
            <button className="btn" disabled={!!avance} onClick={() => archivo.current?.click()}>
              Elegir PDF
            </button>
            <button className="btn ghost" onClick={() => alTerminar()}>
              Cancelar
            </button>
          </div>
          <input
            ref={archivo}
            type="file"
            accept="application/pdf,.pdf"
            hidden
            aria-label="Archivo PDF"
            onChange={(e) => void subirPDF(e.target.files?.[0])}
          />
        </>
      ) : (
        <>
          <div className="f">
            <label htmlFor={ids.texto}>
              <span>Texto</span>
            </label>
            <textarea id={ids.texto} value={texto} rows={8} onChange={(e) => setTexto(e.target.value)} />
          </div>
          <div className="actions">
            <button className="btn" onClick={() => void guardarTexto()}>
              Guardar
            </button>
            <button className="btn ghost" onClick={() => alTerminar()}>
              Cancelar
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ---------- Planes ---------- */

interface PlanPrecargado {
  plan: Plan;
  x: Precarga;
  existente: boolean;
}

function Planes({
  planes,
  precargado,
  alUsarPrecargado,
}: {
  planes: Plan[];
  precargado: PlanPrecargado | null;
  alUsarPrecargado: () => void;
}) {
  const avisar = useAviso();
  const [edit, setEdit] = useState<Plan | null>(null);
  const plan = precargado?.plan ?? edit;
  if (plan)
    return (
      <EditorPlan
        key={plan.id + (precargado ? "-pdf" : "")}
        plan={plan}
        precarga={precargado}
        alCerrar={() => {
          setEdit(null);
          alUsarPrecargado();
        }}
        alGuardar={(p) => {
          if (!p.nombre.trim()) return avisar("Ponle nombre al plan");
          void biblioteca.guardar("planes", p);
          avisar("Plan guardado");
          setEdit(null);
          alUsarPrecargado();
        }}
      />
    );
  return (
    <>
      <div className="actions">
        <button className="btn" onClick={() => setEdit(crearPlan())}>
          + Nuevo plan
        </button>
      </div>
      {planes.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <b>Arma tu catálogo de planes</b>
          Copia del anexo de cada plan sus coberturas, carencias, exclusiones, beneficios y garantías. Al armar una oferta,
          los beneficios se proponen como bonos.
        </div>
      ) : (
        <div className="list" style={{ marginTop: 14 }}>
          {[...planes]
            .sort((a, b) => a.nombre.localeCompare(b.nombre))
            .map((p) => (
              <article key={p.id} className="plan">
                <div className="plan-h">
                  <h3>{p.nombre}</h3>
                  <span className="tag validar">{VALIDAR}</span>
                </div>
                {(p.publico || p.precio) && (
                  <p className="an-note">{[p.publico, p.precio].filter(Boolean).join(" · ")}</p>
                )}
                {CAMPOS_PLAN.filter((c) => c.lista && lineas(p[c.k] as string).length).map((c) => (
                  <div key={c.k} className="plan-l">
                    <b>{c.l}</b>
                    <ul>
                      {lineas(p[c.k] as string).map((x, i) => (
                        <li key={i}>{x}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                <p className="an-note">
                  {conceptosLlenos((p.tabla ?? {}) as TablaCoberturas).length
                    ? `Tabla de coberturas: ${conceptosLlenos((p.tabla ?? {}) as TablaCoberturas).length} conceptos`
                    : "Sin tabla de coberturas: llénala para comparar en cambios de seguro"}
                </p>
                {p.fuente && <p className="an-note">Fuente: {p.fuente}</p>}
                <div className="doc-acc">
                  <button type="button" className="btn ghost small" onClick={() => setEdit(p)}>
                    Editar
                  </button>
                  <BotonConfirmar
                    className="btn ghost small"
                    armadoTexto="¿Borrar?"
                    aria-label={`Borrar plan ${p.nombre}`}
                    onConfirm={() => {
                      void biblioteca.borrar("planes", p.id);
                      avisar("Plan borrado");
                    }}
                  >
                    Borrar
                  </BotonConfirmar>
                </div>
              </article>
            ))}
        </div>
      )}
    </>
  );
}

function EditorPlan({
  plan,
  precarga,
  alCerrar,
  alGuardar,
}: {
  plan: Plan;
  precarga?: PlanPrecargado | null;
  alCerrar: () => void;
  alGuardar: (p: Plan) => void;
}) {
  const [p, setP] = useState(plan);
  const { docs } = useBiblioteca();
  const avisar = useAviso();
  const base = useId();
  const conTexto = docs.filter((d) => d.paginas.some((x) => x.trim()));
  const [docSel, setDocSel] = useState("");
  const [info, setInfo] = useState<Precarga | null>(precarga?.x ?? null);
  const desdeDoc = (id: string) => {
    const d = docs.find((x) => x.id === id);
    if (!d) return;
    const x = precargaDesdeDocumento(d);
    if (!totalPrecarga(x)) return avisar("No encontré datos en ese documento: no invento nada");
    setP(aplicarPrecarga(p, x, d));
    setInfo(x);
    avisar(`Agregué ${totalPrecarga(x)} datos de ${d.nombre}`);
  };
  return (
    <section className="miss" aria-label="Editar plan">
      <h2 className="sub-h">{plan.nombre && !precarga ? "Editar plan" : precarga?.existente ? "Actualizar plan desde el PDF" : "Nuevo plan"}</h2>
      {info ? (
        <div className="precarga" role="status">
          <b>Precargado del PDF: {info.fuente}</b>
          <ul>
            {CAMPOS_PLAN.filter((c) => info.campos[c.k as keyof Precarga["campos"]]?.length).map((c) => (
              <li key={c.k}>
                {c.l}: {info.campos[c.k as keyof Precarga["campos"]]!.length} (pág. {info.paginas[c.k as keyof Precarga["paginas"]]?.join(", ")})
              </li>
            ))}
            {conceptosLlenos(info.tabla).length > 0 && (
              <li>
                Tabla de coberturas: {conceptosLlenos(info.tabla).length} conceptos (pág. {info.paginas.tabla?.join(", ")})
              </li>
            )}
          </ul>
          <small>
            Solo copié lo que está escrito en el documento; lo que no encontré quedó vacío. Revísalo, completa y guarda.
          </small>
        </div>
      ) : (
        <p className="an-note" style={{ marginBottom: 10 }}>
          Precárgalo desde un PDF de tu Biblioteca o cópialo del anexo oficial. Para listas, escribe un punto por línea.
        </p>
      )}
      {conTexto.length > 0 && (
        <div className="precarga-doc">
          <select aria-label="Documento para precargar" value={docSel} onChange={(e) => setDocSel(e.target.value)}>
            <option value="">Precargar desde un documento…</option>
            {conTexto.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </select>
          <button type="button" className="btn ghost small" disabled={!docSel} onClick={() => desdeDoc(docSel)}>
            Precargar
          </button>
        </div>
      )}
      {CAMPOS_PLAN.map((c) => {
        const id = base + c.k;
        const v = (p[c.k] as string) ?? "";
        const set = (x: string) => setP({ ...p, [c.k]: x });
        return (
          <div key={c.k} className="f">
            <label htmlFor={id}>
              <span>{c.l}</span>
            </label>
            {c.lista || c.k === "notas" ? (
              <textarea id={id} value={v} placeholder={c.ph} rows={3} onChange={(e) => set(e.target.value)} />
            ) : (
              <input id={id} value={v} placeholder={c.ph} onChange={(e) => set(e.target.value)} />
            )}
          </div>
        );
      })}
      <h3 className="sub2">Tabla de coberturas (para comparar con el plan actual de un cliente)</h3>
      <EditorTabla
        tabla={(p.tabla ?? {}) as TablaCoberturas}
        set={(t) => setP({ ...p, tabla: t })}
        titulo={`Tabla de coberturas de ${p.nombre || "este plan"}`}
        docs={docs}
      />
      <div className="actions">
        <button className="btn" onClick={() => alGuardar(p)}>
          Guardar plan
        </button>
        <button className="btn ghost" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}

/* ---------- Argumentos ---------- */

function Argumentos({
  args,
  borrador,
  setBorrador,
}: {
  args: Argumento[];
  borrador: Argumento | null;
  setBorrador: (a: Argumento | null) => void;
}) {
  const avisar = useAviso();
  const [filtro, setFiltro] = useState("todos");
  const { sistema } = useArgumentos();
  if (borrador)
    return (
      <EditorArgumento
        arg={borrador}
        nuevo={!args.some((x) => x.id === borrador.id)}
        alCerrar={() => setBorrador(null)}
        alGuardar={(a) => {
          if (!a.texto.trim()) return avisar("Escribe el argumento");
          void biblioteca.guardar("argumentos", a);
          avisar("Argumento guardado");
          setBorrador(null);
        }}
      />
    );
  const usadas = ETIQUETAS_ARGUMENTO.filter((e) => [...args, ...sistema].some((a) => a.etiquetas.includes(e.id)));
  const vis = [...args]
    .filter((a) => filtro === "todos" || a.etiquetas.includes(filtro))
    .sort((a, b) => b.mod - a.mod);
  const visSis = sistema.filter((a) => filtro === "todos" || a.etiquetas.includes(filtro));
  const ocultar = ocultarArgumento;
  return (
    <>
      <div className="actions">
        <button className="btn" onClick={() => setBorrador(crearArgumento())}>
          + Nuevo argumento
        </button>
      </div>
      {usadas.length > 0 && (
        <div className="chips" role="group" aria-label="Filtrar argumentos" style={{ margin: "14px 0 6px" }}>
          <button className="chip" aria-pressed={filtro === "todos"} onClick={() => setFiltro("todos")}>
            Todos {args.length + sistema.length}
          </button>
          {usadas.map((e) => (
            <button key={e.id} className="chip" aria-pressed={filtro === e.id} onClick={() => setFiltro(e.id)}>
              {e.l}
            </button>
          ))}
        </div>
      )}
      <section className="arg-sistema" aria-labelledby="t-arg-sis">
        <h3 id="t-arg-sis" className="sub2">
          🤖 Creados por el sistema ({sistema.length})
        </h3>
        <p className="an-note">
          Los creo con tus planes, documentos y comparaciones, y se actualizan cuando cargas algo nuevo. Solo dicen lo que
          está en tu material, con su fuente: el plan gana por sus beneficios reales.
        </p>
        {sistema.length === 0 ? (
          <p className="an-note">
            Aún no hay suficiente material: carga al menos dos planes con beneficios o tabla de coberturas, documentos, o
            compara planes en fichas de cambio de seguro.
          </p>
        ) : (
          <div className="list" style={{ marginTop: 8 }}>
            {visSis.map((a) => (
              <TarjetaArgumento key={a.id} a={a}>
                <button
                  type="button"
                  className="btn ghost small"
                  onClick={() => {
                    void biblioteca.guardar(
                      "argumentos",
                      crearArgumento(Date.now(), { titulo: a.titulo, texto: a.texto, etiquetas: a.etiquetas, fuente: a.fuente }),
                    );
                    ocultar(a.id);
                    avisar("Guardado en tus argumentos: ya puedes editarlo");
                  }}
                >
                  Guardar como mío
                </button>
                <button type="button" className="btn ghost small" onClick={() => (ocultar(a.id), avisar("Argumento ocultado"))}>
                  Ocultar
                </button>
              </TarjetaArgumento>
            ))}
          </div>
        )}
      </section>
      <h3 className="sub2">Tus argumentos ({args.length})</h3>
      {args.length === 0 ? (
        <div className="empty" style={{ marginTop: 14 }}>
          <b>Tus argumentos de venta</b>
          Escríbelos o guárdalos desde una búsqueda en tus documentos. Etiquétalos por objeción o motivo: en cada ficha
          aparecen los que le sirven.
        </div>
      ) : (
        <div className="list" style={{ marginTop: 8 }}>
          {vis.map((a) => (
            <TarjetaArgumento key={a.id} a={a}>
              <button type="button" className="btn ghost small" onClick={() => setBorrador(a)}>
                Editar
              </button>
              <BotonConfirmar
                className="btn ghost small"
                armadoTexto="¿Borrar?"
                aria-label={`Borrar argumento ${a.titulo || a.texto.slice(0, 20)}`}
                onConfirm={() => {
                  void biblioteca.borrar("argumentos", a.id);
                  avisar("Argumento borrado");
                }}
              >
                Borrar
              </BotonConfirmar>
            </TarjetaArgumento>
          ))}
        </div>
      )}
    </>
  );
}

/** Oculta un argumento del sistema (queda en la Configuración). */
function ocultarArgumento(id: string) {
  const ahora = Date.now();
  const base = biblioteca.getEstado().ajustes[0] ?? ajustesIniciales(ahora);
  void biblioteca.guardar("ajustes", {
    ...base,
    creado: base.creado || ahora,
    argumentosOcultos: [...new Set([...(base.argumentosOcultos ?? []), id])],
  });
}

export function TarjetaArgumento({ a, children }: { a: Argumento; children?: ReactNode }) {
  const avisar = useAviso();
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sinEmojis(a.texto));
      avisar("Argumento copiado");
    } catch {
      avisar("No se pudo copiar");
    }
  };
  return (
    <article className={"arg" + (esAuto(a) ? " auto" : "")}>
      {esAuto(a) && <span className="tag auto-tag">🤖 {ORIGEN_AUTO_L[a.origen]}</span>}
      {a.titulo && <h3>{a.titulo}</h3>}
      <p>{a.texto}</p>
      <div className="tags">
        {a.etiquetas.map((e) => (
          <span key={e} className="tag">
            {ETIQUETA_L[e] ?? e}
          </span>
        ))}
      </div>
      {a.fuente && <p className="an-note">Fuente: {a.fuente}</p>}
      <div className="doc-acc">
        <button type="button" className="btn ghost small" onClick={() => void copiar()}>
          Copiar
        </button>
        {children}
      </div>
    </article>
  );
}

function EditorArgumento({
  arg,
  nuevo,
  alCerrar,
  alGuardar,
}: {
  arg: Argumento;
  nuevo: boolean;
  alCerrar: () => void;
  alGuardar: (a: Argumento) => void;
}) {
  const [a, setA] = useState(arg);
  const ids = { titulo: useId(), texto: useId(), fuente: useId() };
  const alternar = (e: string) =>
    setA({ ...a, etiquetas: a.etiquetas.includes(e) ? a.etiquetas.filter((x) => x !== e) : [...a.etiquetas, e] });
  return (
    <section className="miss" aria-label="Editar argumento">
      <h2 className="sub-h">{nuevo ? "Nuevo argumento" : "Editar argumento"}</h2>
      <div className="f">
        <label htmlFor={ids.titulo}>
          <span>Idea en una línea</span>
        </label>
        <input
          id={ids.titulo}
          value={a.titulo}
          placeholder="La maternidad tiene carencia: contratar antes"
          onChange={(e) => setA({ ...a, titulo: e.target.value })}
        />
      </div>
      <div className="f">
        <label htmlFor={ids.texto}>
          <span>Argumento</span>
        </label>
        <textarea id={ids.texto} value={a.texto} rows={5} onChange={(e) => setA({ ...a, texto: e.target.value })} />
      </div>
      <div className="f" role="group" aria-label="¿Para qué casos sirve?">
        <span>¿Para qué casos sirve?</span>
        <div className="mchips">
          {ETIQUETAS_ARGUMENTO.map((e) => (
            <button
              key={e.id}
              type="button"
              className="mc"
              aria-pressed={a.etiquetas.includes(e.id)}
              onClick={() => alternar(e.id)}
            >
              {e.l}
            </button>
          ))}
        </div>
      </div>
      <div className="f">
        <label htmlFor={ids.fuente}>
          <span>Fuente</span>
        </label>
        <input
          id={ids.fuente}
          value={a.fuente}
          placeholder="Condiciones generales, pág. 12"
          onChange={(e) => setA({ ...a, fuente: e.target.value })}
        />
      </div>
      <div className="actions">
        <button className="btn" onClick={() => alGuardar(a)}>
          Guardar argumento
        </button>
        <button className="btn ghost" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
