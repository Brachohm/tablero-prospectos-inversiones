/**
 * Configuración: perfil del asesor y mensajes editables (seguimiento 1-2-3,
 * saludos e invitación), con un adjunto opcional (sin emojis: muchos
 * teléfonos y correos los muestran como signos raros). Los cambios se
 * guardan con "Guardar y actualizar".
 */
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { MAX_ADJUNTO, MENSAJES_CONFIG } from "../config/ajustes";
import {
  ajustesIniciales,
  errorAdjunto,
  errorPerfil,
  ID_FOTO,
  idArchivo,
  MAX_FOTO,
  mb,
  mensajeDe,
  perfilDe,
  rellenar,
  type Adjunto,
  type Ajustes,
  type ClaveMensaje,
  type Perfil,
} from "../domain/ajustes";
import { biblioteca, useAjustes, useBiblioteca } from "../store/biblioteca";
import { iconoAdjunto, useFotoPerfil } from "./adjuntos";
import { Herramientas } from "./Herramientas";
import { Respaldo } from "./Respaldo";
import { sinEmojis, tieneEmojis } from "../domain/texto";
import { normalizarObjetivos } from "../domain/objetivos";
import { valorUSD } from "../domain/oferta";
import { MAX_OBJETIVOS, MIN_OBJETIVOS } from "../config/objetivos";
import { MAX_COMISIONES, type FilaComision } from "../config/comisiones";
import { TIPOS_PLAN } from "../config/ficha";
import { normalizarComisiones } from "../domain/comisiones";
import { conceptosLlenos, type TablaCoberturas } from "../domain/comparar";
import { useArgumentos, useAviso } from "./hooks";
import { ir, volver, type SeccionAjustes } from "./router";

const SECCIONES: [SeccionAjustes, string][] = [
  ["perfil", "Perfil"],
  ["seguimiento", "Seguimiento"],
  ["saludo", "Saludos"],
  ["invitacion", "Invitación"],
  ["referidos", "Referidos"],
  ["biblioteca", "Biblioteca"],
  ["datos", "Datos"],
];

/** Archivo nuevo elegido (File), quitado (null) o sin cambio (ausente). */
type CambiosArchivo = Partial<Record<ClaveMensaje, File | null>>;

export function AjustesVista({ sec }: { sec: SeccionAjustes }) {
  const { listo } = useBiblioteca();
  const guardados = useAjustes();
  const avisar = useAviso();
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [textos, setTextos] = useState<Partial<Record<ClaveMensaje, string>>>({});
  const [archivos, setArchivos] = useState<CambiosArchivo>({});
  const [guardando, setGuardando] = useState(false);
  const [objetivos, setObjetivos] = useState<FilaObjetivo[] | null>(null);
  const [comisiones, setComisiones] = useState<FilaCom[] | null>(null);
  /** Foto nueva (File), quitada (null) o sin cambio (undefined). */
  const [foto, setFoto] = useState<File | null | undefined>(undefined);

  const base = guardados ?? ajustesIniciales();
  const perfilActual = perfil ?? {
    ...perfilDe(guardados),
    nombreCompleto: guardados?.perfil.nombreCompleto ?? "",
  };
  const texto = (c: ClaveMensaje) => textos[c] ?? mensajeDe(guardados, c).texto;
  const adjunto = (c: ClaveMensaje): Adjunto | undefined => {
    const f = archivos[c];
    if (f === null) return undefined;
    if (f) return { nombre: f.name, tipo: f.type, bytes: f.size };
    return mensajeDe(guardados, c).adjunto;
  };
  const objetivosActuales: FilaObjetivo[] =
    objetivos ??
    normalizarObjetivos(guardados?.objetivos).map((o) => ({ monto: String(o.monto), beneficio: o.beneficio, detalle: o.detalle }));
  const comisionesActuales: FilaCom[] =
    comisiones ?? normalizarComisiones(guardados?.comisiones).map((c) => ({ plan: c.plan, desde: String(c.desde), pct: String(c.pct) }));
  const hayCambios =
    perfil !== null ||
    objetivos !== null ||
    comisiones !== null ||
    foto !== undefined ||
    Object.keys(textos).length > 0 ||
    Object.keys(archivos).length > 0;
  const fotoActual: Adjunto | undefined =
    foto === null ? undefined : foto ? { nombre: foto.name, tipo: foto.type, bytes: foto.size } : guardados?.perfil.foto;

  const guardar = async () => {
    const ep = errorPerfil(perfilActual) || errorObjetivos(objetivosActuales) || errorComisiones(comisionesActuales);
    if (ep) return avisar(ep);
    setGuardando(true);
    const mensajes = { ...base.mensajes };
    for (const m of MENSAJES_CONFIG) {
      const a = adjunto(m.clave);
      mensajes[m.clave] = { texto: sinEmojis(texto(m.clave)), ...(a ? { adjunto: a } : {}) };
    }
    const ahora = Date.now();
    const nuevo: Ajustes = {
      ...base,
      creado: base.creado || ahora,
      perfil: {
        nombreCompleto: perfilActual.nombreCompleto.trim(),
        apodo: perfilActual.apodo.trim(),
        rol: perfilActual.rol.trim(),
        celular: perfilActual.celular?.trim() ?? "",
        correo: perfilActual.correo?.trim().toLowerCase() ?? "",
        proposito: perfilActual.proposito?.trim() ?? "",
        ...(fotoActual ? { foto: fotoActual } : {}),
      },
      mensajes,
      objetivos: normalizarObjetivos(
        objetivosActuales.map((o) => ({ monto: valorUSD(o.monto) ?? 0, beneficio: o.beneficio, detalle: o.detalle })),
      ),
      comisiones: normalizarComisiones(comisionesActuales.map((c) => ({ plan: c.plan, desde: numero(c.desde), pct: numero(c.pct) }))),
    };
    for (const [c, f] of Object.entries(archivos) as [ClaveMensaje, File | null][])
      void biblioteca.ponerArchivo(idArchivo(c), f);
    if (foto !== undefined) void biblioteca.ponerArchivo(ID_FOTO, foto);
    await biblioteca.guardar("ajustes", nuevo);
    setPerfil(null);
    setObjetivos(null);
    setComisiones(null);
    setTextos({});
    setArchivos({});
    setFoto(undefined);
    setGuardando(false);
    avisar("Configuración guardada y actualizada");
  };

  const descartar = () => {
    setPerfil(null);
    setObjetivos(null);
    setComisiones(null);
    setTextos({});
    setArchivos({});
    setFoto(undefined);
  };

  return (
    <div className="wrap page-top ajustes">
      <div className="top">
        <button className="back" onClick={() => volver()} aria-label="Volver">
          ←
        </button>
        <div className="who">
          <b>Configuración</b>
          <small>Tu perfil y tus mensajes</small>
        </div>
      </div>
      <div className="tabs seis" role="tablist" aria-label="Secciones de la configuración">
        {SECCIONES.map(([id, l]) => (
          <button
            key={id}
            role="tab"
            className="tab"
            aria-selected={sec === id}
            onClick={() => ir({ v: "ajustes", sec: id }, { reemplazar: true })}
          >
            {l}
          </button>
        ))}
      </div>

      {!listo ? (
        <p className="an-note" role="status">
          Cargando…
        </p>
      ) : sec === "biblioteca" ? (
        <SeccionBiblioteca />
      ) : sec === "datos" ? (
        <>
          <Respaldo />
        </>
      ) : sec === "perfil" ? (
        <>
          <FotoPerfil nueva={foto} hay={!!fotoActual} set={setFoto} />
          <SeccionPerfil p={perfilActual} set={setPerfil} />
          <SeccionObjetivos filas={objetivosActuales} set={setObjetivos} />
          <SeccionComisiones filas={comisionesActuales} set={setComisiones} />
          <Herramientas guardados={guardados} pendiente={hayCambios} />
        </>
      ) : (
        <>
          <p className="an-note" style={{ marginTop: 12 }}>
            {sec === "seguimiento" &&
              "Se envían según el nivel de respuesta del prospecto: el día 1, el 3 y el 5, contando de lunes a sábado (el domingo no se envía). Si contesta, se detiene y puedes empezar de nuevo con el mensaje 1."}
            {sec === "saludo" &&
              "Opciones de saludo para tus contactos. El saludo de los referidos está en la pestaña Referidos."}
            {sec === "referidos" &&
              "Los mensajes de la cadena de referidos: el saludo y los siguientes. Usa {referidor} (quien lo refirió) y {relacion} (\", su amiga,\" según la relación)."}
            {sec === "invitacion" &&
              "Invita a la reunión por WhatsApp o por correo. Es distinta al recordatorio de la reunión. Usa {fecha}, {hora} y {lugar} de la próxima reunión de la ficha."}
          </p>
          {MENSAJES_CONFIG.filter((m) => m.grupo === sec).map((m) => (
            <EditorMensaje
              key={m.clave}
              clave={m.clave}
              l={m.l}
              ayuda={m.ayuda}
              acepta={m.adjunto}
              texto={texto(m.clave)}
              setTexto={(t) => setTextos((x) => ({ ...x, [m.clave]: t }))}
              adjunto={adjunto(m.clave)}
              archivoNuevo={archivos[m.clave]}
              setArchivo={(f) => setArchivos((x) => ({ ...x, [m.clave]: f }))}
              perfil={perfilActual}
            />
          ))}
        </>
      )}

      {sec !== "datos" && sec !== "biblioteca" && (
        <div className="guardar-barra">
          {hayCambios && <span className="pend">Cambios sin guardar</span>}
          {hayCambios && (
            <button className="btn ghost small" onClick={descartar}>
              Descartar
            </button>
          )}
          <button className="btn" disabled={!hayCambios || guardando} onClick={() => void guardar()}>
            {guardando ? "Guardando…" : "Guardar y actualizar"}
          </button>
        </div>
      )}
    </div>
  );
}

interface FilaCom {
  plan: FilaComision["plan"];
  desde: string;
  pct: string;
}

const numero = (x: string) => Number(x.replace(",", "."));

function errorComisiones(fs: FilaCom[]): string {
  for (const [i, f] of fs.entries()) {
    const d = numero(f.desde);
    const p = numero(f.pct);
    if (!f.desde.trim() || !Number.isFinite(d) || d < 0) return `Escribe el plazo desde el que aplica la comisión ${i + 1}`;
    if (!f.pct.trim() || !Number.isFinite(p) || p <= 0 || p > 200) return `Escribe el porcentaje de la comisión ${i + 1}`;
  }
  const k = fs.map((f) => f.plan + "|" + numero(f.desde));
  const rep = k.findIndex((x, i) => k.indexOf(x) !== i);
  if (rep !== -1) return `La comisión ${rep + 1} repite tipo de plan y plazo`;
  return "";
}

/** Tabla de comisiones: por tipo de plan, desde qué plazo y qué porcentaje. */
function SeccionComisiones({ filas, set }: { filas: FilaCom[]; set: (f: FilaCom[]) => void }) {
  const id = useId();
  const cambiar = (i: number, c: Partial<FilaCom>) => set(filas.map((f, j) => (j === i ? { ...f, ...c } : f)));
  return (
    <section className="miss" aria-labelledby={id + "t"}>
      <h2 className="sub-h" id={id + "t"}>
        💼 Comisiones
      </h2>
      <p className="an-note">
        Tu comisión por tipo de plan y plazo. Contribución regular: porcentaje sobre el aporte anual (12 × el mensual).
        Contribución única: porcentaje sobre el aporte total. A cada venta se le aplica la fila con el plazo más alto que
        no supere el plazo del plan.
      </p>
      {!filas.length && <p className="an-note">Aún no hay comisiones: agrega la primera fila.</p>}
      <ol className="objetivos-edit">
        {filas.map((f, i) => (
          <li key={i} aria-label={`Comisión ${i + 1}`}>
            <div className="f">
              <label htmlFor={`${id}p${i}`}>
                <span>Tipo de plan (comisión {i + 1})</span>
              </label>
              <select id={`${id}p${i}`} value={f.plan} onChange={(e) => cambiar(i, { plan: e.target.value as FilaCom["plan"] })}>
                {TIPOS_PLAN.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="oe-fila">
              <div className="f">
                <label htmlFor={`${id}d${i}`}>
                  <span>Desde (años de plazo)</span>
                </label>
                <input
                  id={`${id}d${i}`}
                  inputMode="numeric"
                  value={f.desde}
                  placeholder="10"
                  onChange={(e) => cambiar(i, { desde: e.target.value.replace(/[^\d]/g, "") })}
                />
              </div>
              <div className="f">
                <label htmlFor={`${id}c${i}`}>
                  <span>Comisión (%)</span>
                </label>
                <input
                  id={`${id}c${i}`}
                  inputMode="decimal"
                  value={f.pct}
                  placeholder="30"
                  onChange={(e) => cambiar(i, { pct: e.target.value.replace(/[^\d.,]/g, "") })}
                />
              </div>
            </div>
            <button type="button" className="enlace" onClick={() => set(filas.filter((_, j) => j !== i))}>
              Quitar comisión {i + 1}
            </button>
          </li>
        ))}
      </ol>
      {filas.length < MAX_COMISIONES && (
        <button
          type="button"
          className="btn ghost small"
          onClick={() => set([...filas, { plan: TIPOS_PLAN[0], desde: "", pct: "" }])}
        >
          + Agregar comisión
        </button>
      )}
    </section>
  );
}

interface FilaObjetivo {
  monto: string;
  beneficio: boolean;
  detalle: string;
}

function errorObjetivos(fs: FilaObjetivo[]): string {
  if (fs.length < MIN_OBJETIVOS) return "Agrega al menos un objetivo";
  for (const [i, f] of fs.entries()) {
    const n = valorUSD(f.monto) ?? NaN;
    if (!f.monto.trim() || !Number.isFinite(n) || n <= 0) return `Escribe el monto del objetivo ${i + 1}`;
    if (f.beneficio && !f.detalle.trim()) return `Escribe el beneficio del objetivo ${i + 1}`;
  }
  return "";
}

/** Objetivos del mes (1 a 4): monto de prima mensual y su beneficio, si aplica. */
function SeccionObjetivos({ filas, set }: { filas: FilaObjetivo[]; set: (f: FilaObjetivo[]) => void }) {
  const id = useId();
  const cambiar = (i: number, c: Partial<FilaObjetivo>) => set(filas.map((f, j) => (j === i ? { ...f, ...c } : f)));
  return (
    <section className="miss" aria-labelledby={id + "t"}>
      <h2 className="sub-h" id={id + "t"}>
        🎯 Objetivos del mes
      </h2>
      <p className="an-note">
        De {MIN_OBJETIVOS} a {MAX_OBJETIVOS} objetivos de aportes cerrados en el mes. El primero es tu meta; cada uno puede
        desbloquear un beneficio.
      </p>
      <ol className="objetivos-edit">
        {filas.map((f, i) => (
          <li key={i} aria-label={`Objetivo ${i + 1}`}>
            <div className="oe-fila">
              <div className="f">
                <label htmlFor={`${id}m${i}`}>
                  <span>Objetivo {i + 1} (USD)</span>
                </label>
                <input
                  id={`${id}m${i}`}
                  inputMode="decimal"
                  value={f.monto}
                  placeholder="750"
                  onChange={(e) => cambiar(i, { monto: e.target.value.replace(/[^\d.,]/g, "") })}
                />
              </div>
              <div className="f" role="group" aria-label={`Beneficio del objetivo ${i + 1}`}>
                <span>Beneficio</span>
                <div className="si-no">
                  <button type="button" aria-pressed={f.beneficio} onClick={() => cambiar(i, { beneficio: true })}>
                    Sí
                  </button>
                  <button type="button" aria-pressed={!f.beneficio} onClick={() => cambiar(i, { beneficio: false })}>
                    No
                  </button>
                </div>
              </div>
            </div>
            {f.beneficio && (
              <div className="f">
                <label htmlFor={`${id}d${i}`}>
                  <span>Detalle</span>
                </label>
                <input
                  id={`${id}d${i}`}
                  value={f.detalle}
                  placeholder="90% de comisión"
                  onChange={(e) => cambiar(i, { detalle: e.target.value })}
                />
              </div>
            )}
            {filas.length > MIN_OBJETIVOS && (
              <button type="button" className="enlace" onClick={() => set(filas.filter((_, j) => j !== i))}>
                Quitar objetivo {i + 1}
              </button>
            )}
          </li>
        ))}
      </ol>
      {filas.length < MAX_OBJETIVOS && (
        <button
          type="button"
          className="btn ghost small"
          onClick={() => set([...filas, { monto: "", beneficio: false, detalle: "" }])}
        >
          + Agregar objetivo
        </button>
      )}
    </section>
  );
}

/** Biblioteca: el material del que se alimentan los análisis, ofertas e informes. */
function SeccionBiblioteca() {
  const { docs, planes, argumentos } = useBiblioteca();
  const { sistema } = useArgumentos();
  const conTabla = planes.filter((p) => conceptosLlenos((p.tabla ?? {}) as TablaCoberturas).length > 0).length;
  const items: { sec: "docs" | "planes" | "argumentos"; ic: string; l: string; d: string }[] = [
    {
      sec: "docs",
      ic: "📄",
      l: `Documentos (${docs.length})`,
      d: "Condiciones generales y anexos de los planes, con búsqueda sin conexión.",
    },
    {
      sec: "planes",
      ic: "🗂️",
      l: `Planes (${planes.length})`,
      d: `Condiciones, fondos, costos y su tabla de datos${planes.length ? ` (${conTabla} con tabla)` : ""}.`,
    },
    {
      sec: "argumentos",
      ic: "💡",
      l: `Argumentos (${argumentos.length + sistema.length})`,
      d: `${sistema.length} creados por el sistema con tus planes, documentos y comparaciones, y ${argumentos.length} tuyos.`,
    },
  ];
  return (
    <section className="miss" aria-labelledby="t-bib">
      <h2 className="sub-h" id="t-bib">
        📚 Biblioteca
      </h2>
      <p className="an-note">
        De aquí se alimenta el sistema: con este material se arman los análisis, la comparación de planes, las ofertas y
        los informes. Mantenlo al día con el material vigente. Todo vive solo en este dispositivo.
      </p>
      <div className="list" style={{ marginTop: 10 }}>
        {items.map((x) => (
          <button key={x.sec} className="bib-entrada" onClick={() => ir({ v: "biblioteca", sec: x.sec })}>
            <span className="ico" aria-hidden="true">
              {x.ic}
            </span>
            <span>
              <b>{x.l}</b>
              <small>{x.d}</small>
            </span>
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function SeccionPerfil({ p, set }: { p: Perfil; set: (p: Perfil) => void }) {
  const id = useId();
  const campo = (k: Exclude<keyof Perfil, "foto">, l: string, ayuda: string, ph: string, tipo = "text") => (
    <div className="f">
      <label htmlFor={id + k}>
        <span>{l}</span>
      </label>
      <input
        id={id + k}
        type={tipo}
        inputMode={tipo === "tel" ? "tel" : tipo === "email" ? "email" : undefined}
        value={p[k] ?? ""}
        placeholder={ph}
        autoComplete="off"
        onChange={(e) => set({ ...p, [k]: e.target.value })}
      />
      <p className="an-note ayuda" style={{ marginTop: 4 }}>
        {ayuda}
      </p>
    </div>
  );
  return (
    <section className="miss" aria-label="Perfil del agente">
      <h2 className="sub-h">Perfil del agente</h2>
      <div className="f">
        <label htmlFor={id + "proposito"}>
          <span>Propósito</span>
        </label>
        <textarea
          id={id + "proposito"}
          rows={2}
          value={p.proposito ?? ""}
          placeholder="Darle a mi familia una vida tranquila y ayudar a otras familias a estar protegidas."
          onChange={(e) => set({ ...p, proposito: e.target.value })}
        />
        <p className="an-note ayuda" style={{ marginTop: 4 }}>
          El para qué lo haces. Aparece en grande en el Inicio, arriba de tu barra de progreso.
        </p>
      </div>
      {campo("nombreCompleto", "Nombre completo", "Para tus registros y correos.", "Nombre y apellidos")}
      {campo(
        "apodo",
        "Cómo te gusta que te llamen",
        "Es tu nombre en las presentaciones de WhatsApp: “Soy …”.",
        "Bracho",
      )}
      {campo("rol", "Rol", "Se usa después de tu nombre: “Soy Bracho, asesor de inversiones”.", "asesor de inversiones")}
      {campo("celular", "Celular (WhatsApp)", "El número con el que usas WhatsApp para la gestión.", "099 123 4567", "tel")}
      {campo("correo", "Correo electrónico", "Según su dominio se abre Gmail, Outlook, Yahoo o tu app de correo.", "tu@correo.com", "email")}
      <p className="an-status">
        Vista previa: “Hola Ana, soy {p.apodo.trim() || "…"}, {p.rol.trim() || "…"}.”
      </p>
    </section>
  );
}

function EditorMensaje({
  clave,
  l,
  ayuda,
  acepta,
  texto,
  setTexto,
  adjunto,
  archivoNuevo,
  setArchivo,
  perfil,
}: {
  clave: ClaveMensaje;
  l: string;
  ayuda: string;
  acepta: "cualquiera" | "video" | "foto" | null;
  texto: string;
  setTexto: (t: string) => void;
  adjunto: Adjunto | undefined;
  archivoNuevo: File | null | undefined;
  setArchivo: (f: File | null) => void;
  perfil: Perfil;
}) {
  const avisar = useAviso();
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [miniatura, setMiniatura] = useState<string | null>(null);

  // Miniatura de la foto o del video (el nuevo o el guardado).
  useEffect(() => {
    let url: string | null = null;
    let vivo = true;
    const mostrar = (b: Blob | undefined) => {
      if (!vivo || !b || !(b.type.startsWith("image/") || b.type.startsWith("video/"))) return setMiniatura(null);
      url = URL.createObjectURL(b);
      setMiniatura(url);
    };
    const fuente: Promise<Blob | undefined> = archivoNuevo
      ? Promise.resolve(archivoNuevo)
      : archivoNuevo === undefined && adjunto
        ? biblioteca.archivo(idArchivo(clave))
        : Promise.resolve(undefined);
    void fuente.then(mostrar);
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [archivoNuevo, adjunto, clave]);

  /** Inserta en la posición del cursor. */
  const insertar = (s: string) => {
    const el = area.current;
    const ini = el?.selectionStart ?? texto.length;
    const fin = el?.selectionEnd ?? texto.length;
    setTexto(texto.slice(0, ini) + s + texto.slice(fin));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(ini + s.length, ini + s.length);
    });
  };

  const elegir = (f: File | undefined) => {
    if (input.current) input.current.value = "";
    if (!f || !acepta) return;
    const e = errorAdjunto(f, acepta, MAX_ADJUNTO);
    if (e) return avisar(e);
    setArchivo(f);
  };

  const ejemplo = sinEmojis(rellenar(texto, {
    nombre: "Ana",
    asesor: perfil.apodo.trim(),
    rol: perfil.rol.trim(),
    fecha: "el jueves 9 de octubre",
    hora: "10:30",
    lugar: " en tu oficina",
    referidor: "Carla",
    relacion: ", su amiga,",
  }));
  const variables: [string, string][] = [
    ["{nombre}", "Nombre del prospecto"],
    ["{asesor}", "Tu nombre"],
    ["{saludo}", "Buenos días / tardes / noches, según la hora"],
    ["{deseo}", "Un excelente día / tarde, una linda noche"],
    ...(clave.startsWith("ref")
      ? ([
          ["{referidor}", "Quien lo refirió"],
          ["{relacion}", "Relación (su amiga, su jefe…)"],
          ["{rol}", "Tu rol"],
        ] as [string, string][])
      : []),
    ...(clave === "invitacion"
      ? ([
          ["{fecha}", "Fecha"],
          ["{hora}", "Hora"],
          ["{lugar}", "Lugar"],
        ] as [string, string][])
      : []),
  ];

  return (
    <section className="miss editor-msj" aria-label={l}>
      <h2 className="sub-h">{l}</h2>
      <p className="an-note ayuda">{ayuda}</p>
      <label className="sr" htmlFor={id}>
        Texto de {l}
      </label>
      <textarea id={id} ref={area} rows={5} value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="ideas" role="group" aria-label={`Insertar en ${l}`}>
        {variables.map(([v, t]) => (
          <button key={v} type="button" className="idea" onClick={() => insertar(v)}>
            + {t}
          </button>
        ))}
      </div>
      {tieneEmojis(texto) && (
        <p className="an-status warn">Los emojis no se envían: WhatsApp y el correo los muestran como signos raros. Se quitarán al guardar.</p>
      )}
      {acepta && (
        <div className="adjunto">
          {adjunto ? (
            <div className="adj-fila">
              {miniatura && adjunto.tipo.startsWith("image/") && <img src={miniatura} alt="" />}
              {miniatura && adjunto.tipo.startsWith("video/") && <video src={miniatura} muted playsInline />}
              <span>
                {iconoAdjunto(adjunto.tipo)} <b>{adjunto.nombre}</b>
                <small>{mb(adjunto.bytes)}</small>
              </span>
              <button
                type="button"
                className="btn ghost small"
                onClick={() => setArchivo(null)}
                aria-label={`Quitar adjunto de ${l}`}
              >
                Quitar
              </button>
            </div>
          ) : null}
          <button type="button" className="btn ghost small" onClick={() => input.current?.click()}>
            {adjunto
              ? "Cambiar"
              : acepta === "video"
                ? "🎬 Agregar video"
                : acepta === "foto"
                  ? "📷 Agregar foto"
                  : "📎 Agregar foto o archivo"}
          </button>
          <input
            ref={input}
            type="file"
            hidden
            aria-label={`Adjunto de ${l}`}
            accept={acepta === "video" ? "video/*" : acepta === "foto" ? "image/*" : undefined}
            onChange={(e) => elegir(e.target.files?.[0])}
          />
          <small className="an-note">Máximo {mb(MAX_ADJUNTO)}.</small>
        </div>
      )}
      <p className="ejemplo">
        <small>Así lo verá Ana:</small>
        {ejemplo}
      </p>
    </section>
  );
}

/** Tu foto: va en el saludo a quien no te tiene registrado y en el membrete de los PDF. */
function FotoPerfil({ nueva, hay, set }: { nueva: File | null | undefined; hay: boolean; set: (f: File | null) => void }) {
  const id = useId();
  const avisar = useAviso();
  const guardada = useFotoPerfil();
  const archivo = nueva === undefined ? guardada : nueva;
  const url = useMemo(() => (archivo && hay ? URL.createObjectURL(archivo) : null), [archivo, hay]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  const elegir = (f: File | undefined) => {
    if (!f) return;
    const e = errorAdjunto(f, "foto", MAX_FOTO);
    if (e) return avisar(e);
    set(f);
  };
  return (
    <section className="miss foto-perfil" aria-label="Tu foto">
      <h2 className="sub-h">Tu foto</h2>
      <p className="an-note ayuda">
        Se adjunta en el saludo a quien aún no tiene tu número registrado y va en el membrete de los informes en PDF, junto
        con tus datos. Hasta {mb(MAX_FOTO)}.
      </p>
      <div className="foto-fila">
        {url ? <img src={url} alt="Tu foto" className="foto-mini" /> : <span className="foto-mini vacia" aria-hidden="true">👤</span>}
        <div className="foto-acciones">
          <label className="btn small" htmlFor={id}>
            {hay ? "Cambiar foto" : "Subir foto"}
          </label>
          <input
            id={id}
            className="sr"
            type="file"
            accept="image/*"
            aria-label="Elegir tu foto"
            onChange={(e) => {
              elegir(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {hay && (
            <button type="button" className="btn ghost small" onClick={() => set(null)}>
              Quitar
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
