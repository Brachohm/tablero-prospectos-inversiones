/**
 * Contactos nuevos (nombre, edad, género, celular y correo) y el recordatorio
 * diario de saludarlos. Al escribirles por WhatsApp o llamarles, el saludo de
 * hoy se marca solo (con "Deshacer").
 */
import { useId, useState } from "react";
import { RELACIONES } from "../config/referidos";
import { claves } from "../domain/importar";
import { useFichas } from "../store/store";
import { ORIGENES } from "../config/ficha";
import { marcarPaso, siguientePaso } from "../domain/referidos";
import { CadenaReferido } from "./Cadena";
import {
  activo,
  saludable,
  datosReferido,
  enCadena,
  crearContacto,
  desmarcarSaludo,
  errorContacto,
  GENEROS,
  marcarSaludo,
  porSaludar,
  saludadoHoy,
  type ContactoNuevo,
  type Genero,
} from "../domain/contactos";
import { diasHasta, fmtFecha } from "../domain/fechas";
import { telefonoDe, txt, whatsAppDe } from "../domain/ficha";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { BotonConfirmar } from "./comunes";
import { useAjustesPerfil, useAviso, useEnlaces } from "./hooks";
import { useFotoPerfil, compartirConArchivo, useArchivoAdjunto } from "./adjuntos";
import { conPresentacion, mensajeDe, primerNombre, rellenar, saludoDisponible } from "../domain/ajustes";
import { ir } from "./router";

function useSaludar() {
  const avisar = useAviso();
  return (c: ContactoNuevo, hoy: string, como: string) => {
    if (saludadoHoy(c, hoy)) return;
    const previo = c.ultimoSaludo;
    const nuevo = marcarSaludo(c, hoy);
    void biblioteca.guardar("contactos", nuevo);
    avisar(`${como}: saludo de hoy registrado`, {
      texto: "Deshacer",
      alTocar: () => {
        const actual = biblioteca.getEstado().contactos.find((x) => x.id === c.id);
        if (actual) void biblioteca.guardar("contactos", desmarcarSaludo(actual, previo));
      },
    });
  };
}

function detalle(c: ContactoNuevo): string {
  return [c.edad.trim() && `${c.edad.trim()} años`, c.genero].filter(Boolean).join(" · ");
}

type ClaveSaludo = "saludoTexto" | "saludoVideo" | "saludoFoto";

const OPCIONES_SALUDO: [ClaveSaludo, string, string][] = [
  ["saludoTexto", "💬", "Texto"],
  ["saludoVideo", "🎬", "Con video"],
  ["saludoFoto", "📷", "Con foto"],
];

function BotonesSaludo({ c, hoy }: { c: ContactoNuevo; hoy: string }) {
  const saludar = useSaludar();
  const avisar = useAviso();
  const { ajustes, perfil } = useAjustesPerfil();
  const [abierto, setAbierto] = useState(false);
  const video = mensajeDe(ajustes, "saludoVideo");
  const foto = mensajeDe(ajustes, "saludoFoto");
  const fVideo = useArchivoAdjunto("saludoVideo", video.adjunto);
  const fFoto = useArchivoAdjunto("saludoFoto", foto.adjunto);
  const wa = whatsAppDe(c.celular);
  const tel = telefonoDe(c.celular);
  const vars = { nombre: primerNombre(c.nombre), asesor: perfil.apodo, rol: perfil.rol };
  // Sin tu número registrado: el saludo lleva tu presentación breve.
  const texto = (k: ClaveSaludo) => {
    const t = rellenar(mensajeDe(ajustes, k).texto, vars);
    return c.registrado === false ? conPresentacion(t, rellenar(mensajeDe(ajustes, "presentacion").texto, vars), perfil.apodo) : t;
  };
  // Sin tu número registrado: el saludo de texto va con tu foto (si la subiste).
  const fotoYo = useFotoPerfil();
  const conFotoYo = c.registrado === false && !!fotoYo;
  const archivo = (k: ClaveSaludo) =>
    k === "saludoVideo" ? fVideo : k === "saludoFoto" ? fFoto : conFotoYo ? fotoYo : null;
  const opciones = OPCIONES_SALUDO.filter(([k]) => saludoDisponible(ajustes, k) && (k === "saludoTexto" || archivo(k)));
  const enl = useEnlaces();
  const enlaceTexto = wa ? enl.wa(wa, texto("saludoTexto")) : null;

  const conArchivo = async (k: ClaveSaludo) => {
    const f = archivo(k);
    if (!f) return;
    const r = await compartirConArchivo(texto(k), f);
    if (r === "cancelado") return;
    saludar(c, hoy, k === "saludoVideo" ? "Saludo con video" : k === "saludoFoto" ? "Saludo con foto" : "Saludo con su presentación y foto");
    if (r === "descargado") avisar("Texto copiado y archivo descargado: adjúntalo en WhatsApp");
  };

  return (
    <>
      {conFotoYo && opciones.length <= 1 && (
        <button
          type="button"
          className="contacto wa"
          aria-label={`Saludar por WhatsApp a ${c.nombre}`}
          onClick={() => void conArchivo("saludoTexto")}
        >
          <span aria-hidden="true">💬</span>
        </button>
      )}
      {!conFotoYo && enlaceTexto && opciones.length <= 1 && (
        <a
          className="contacto wa"
          {...enlaceTexto}
          rel="noopener noreferrer"
          aria-label={`Saludar por WhatsApp a ${c.nombre}`}
          onClick={() => saludar(c, hoy, "WhatsApp")}
        >
          <span aria-hidden="true">💬</span>
        </a>
      )}
      {opciones.length > 1 && (
        <button
          type="button"
          className="contacto wa"
          aria-expanded={abierto}
          aria-label={`Elegir saludo para ${c.nombre}`}
          onClick={() => setAbierto(!abierto)}
        >
          <span aria-hidden="true">💬</span>
        </button>
      )}
      {tel && (
        <a
          className="contacto llamar"
          href={"tel:" + tel}
          aria-label={`Llamar a ${c.nombre}`}
          onClick={() => saludar(c, hoy, "Llamada")}
        >
          <span aria-hidden="true">📞</span>
        </a>
      )}
      {abierto && opciones.length > 1 && (
        <div className="saludo-opc" role="group" aria-label={`Saludos para ${c.nombre}`}>
          {opciones.map(([k, ic, l]) =>
            k === "saludoTexto" && !conFotoYo ? (
              enlaceTexto && (
                <a
                  key={k}
                  className="btn small wa-btn"
                  {...enlaceTexto}
                  rel="noopener noreferrer"
                  onClick={() => {
                    saludar(c, hoy, "WhatsApp");
                    setAbierto(false);
                  }}
                >
                  {ic} {l}
                </a>
              )
            ) : (
              <button
                key={k}
                type="button"
                className="btn small wa-btn"
                onClick={() => {
                  void conArchivo(k);
                  setAbierto(false);
                }}
              >
                {ic} {l}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}

/** Tarjeta del tablero: a quién saludar hoy. */
export function Saludos({ hoy }: { hoy: string }) {
  const { contactos } = useBiblioteca();
  const saludar = useSaludar();
  const activos = contactos.filter(saludable);
  const referidos = contactos.filter(enCadena);
  if (!activos.length && !referidos.length) return null;
  const pend = porSaludar(contactos, hoy);
  const hechos = activos.length - pend.length;
  return (
    <>
      {referidos.length > 0 && <ReferidosPendientes lista={referidos} />}
      {activos.length > 0 && (
        <section className="agenda saludos" aria-labelledby="t-saludos">
          <h2 id="t-saludos">
            <span aria-hidden="true">👋</span> Saludar hoy
            <small>
              {hechos} de {activos.length} saludados
            </small>
          </h2>
          <div className="mbar" aria-hidden="true">
            <i style={{ width: (hechos / activos.length) * 100 + "%" }} />
          </div>
          {pend.length === 0 ? (
            <p className="ag-vacio">¡Saludaste a todos tus contactos hoy! Mañana vuelven a aparecer.</p>
          ) : (
            <div className="ag-g">
              {pend.map((c) => (
                <div key={c.id} className="ag-fila">
                  <div className="ag-it">
                    <span className="ic" aria-hidden="true">
                      👋
                    </span>
                    <span>
                      <b>{c.nombre}</b>
                      <small>
                        {c.ultimoSaludo
                          ? `Último saludo: ${diasHasta(c.ultimoSaludo, hoy) === -1 ? "ayer" : fmtFecha(c.ultimoSaludo)}`
                          : "Aún sin saludar"}
                      </small>
                    </span>
                  </div>
                  <BotonesSaludo c={c} hoy={hoy} />
                  <button
                    type="button"
                    className="contacto hecho"
                    aria-label={`Marcar como saludado a ${c.nombre}`}
                    onClick={() => saludar(c, hoy, c.nombre)}
                  >
                    <span aria-hidden="true">✓</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}

function guardarCadena(c: ContactoNuevo, i: number, dia: string | null) {
  const actual = biblioteca.getEstado().contactos.find((x) => x.id === c.id) ?? c;
  void biblioteca.guardar("contactos", { ...actual, cadena: marcarPaso(actual.cadena, i, dia) });
}

/** Referidos con mensajes de la cadena por activar. */
function ReferidosPendientes({ lista }: { lista: ContactoNuevo[] }) {
  return (
    <section className="agenda referidos" aria-labelledby="t-referidos">
      <h2 id="t-referidos">
        <span aria-hidden="true">🔗</span> Referidos por contactar
        <small>{lista.length}</small>
      </h2>
      <div className="ag-g">
        {lista.map((c) => {
          const sig = siguientePaso(datosReferido(c));
          return (
            <button
              key={c.id}
              type="button"
              className="ag-it"
              onClick={() => ir({ v: "gestion", modo: "contactos" })}
            >
              <span className="ic" aria-hidden="true">
                🔗
              </span>
              <span>
                <b>{c.nombre}</b>
                <small>
                  De {c.referidor} · {sig ? `toca enviar el mensaje ${sig.n}: ${sig.l.toLowerCase()}` : ""}
                </small>
              </span>
              <span className="d">{sig ? `Msj ${sig.n}` : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Inicio: agregar un contacto nuevo sin salir del tablero. Queda en la Base de datos y en el Centro de Gestión. */
export function NuevoContactoRapido() {
  const avisar = useAviso();
  const [abierto, setAbierto] = useState(false);
  const [nuevo, setNuevo] = useState<ContactoNuevo | null>(null);
  return (
    <>
      <button
        className="nuevo-contacto"
        onClick={() => {
          setNuevo(crearContacto({ registrado: false }));
          setAbierto(true);
        }}
      >
        <span aria-hidden="true">➕</span>
        <span>
          <b>Nuevo contacto</b>
          <small>Se guarda en tu Base de datos y entra a tu gestión de hoy</small>
        </span>
      </button>
      {abierto && nuevo && (
        <div className="hoja-fondo" role="dialog" aria-modal="true" aria-label="Agregar contacto">
          <section className="hoja">
            <div className="hoja-top">
              <h2>➕ Nuevo contacto</h2>
              <button className="back" onClick={() => setAbierto(false)} aria-label="Cerrar">
                ✕
              </button>
            </div>
            <FormContacto
              c={nuevo}
              nuevo
              alCerrar={() => setAbierto(false)}
              alGuardar={(c) => {
                void biblioteca.guardar("contactos", c);
                setAbierto(false);
                avisar(`${c.nombre.trim()} quedó en tu Base de datos y en el Centro de Gestión`);
              }}
            />
          </section>
        </div>
      )}
    </>
  );
}

/** "Pasar a reunión": elegir si es nuevo cliente o ya invierte y abrir su ficha. */
function PasarAReunion({ id }: { id: string }) {
  const [abierto, setAbierto] = useState(false);
  if (!abierto)
    return (
      <button type="button" className="btn small" aria-expanded={false} onClick={() => setAbierto(true)}>
        🤝 Pasar a reunión
      </button>
    );
  return (
    <div className="pasar-mini" role="group" aria-label="¿Nuevo cliente o ya invierte?">
      <button type="button" className="btn small" onClick={() => ir({ v: "nueva", tipo: "nuevo", contacto: id })}>
        🚀 Nuevo cliente
      </button>
      <button type="button" className="btn small cambio" onClick={() => ir({ v: "nueva", tipo: "cambio", contacto: id })}>
        🔄 Ya invierte
      </button>
      <button type="button" className="btn ghost small" onClick={() => setAbierto(false)}>
        Cancelar
      </button>
    </div>
  );
}

/** Pestaña "Contactos": registrar y administrar. */
export function ListaContactos({ hoy }: { hoy: string }) {
  const enl = useEnlaces();
  const { contactos, listo } = useBiblioteca();
  const avisar = useAviso();
  const [edit, setEdit] = useState<ContactoNuevo | null>(null);
  const [verPasados, setVerPasados] = useState(false);
  const activos = contactos.filter(activo).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const pasados = contactos.filter((c) => !activo(c));

  return (
    <div style={{ marginTop: 14 }}>
      {edit ? (
        <FormContacto
          c={edit}
          nuevo={!contactos.some((x) => x.id === edit.id)}
          alCerrar={() => setEdit(null)}
          alGuardar={(c) => {
            void biblioteca.guardar("contactos", c);
            avisar("Contacto guardado");
            setEdit(null);
          }}
        />
      ) : (
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => setEdit(crearContacto({ registrado: false }))}>
            + Nuevo contacto
          </button>
        </div>
      )}
      <div className="list" style={{ marginTop: 14 }}>
        {listo && activos.length === 0 && !edit && (
          <div className="empty">
            <b>Registra a tus contactos nuevos</b>
            Nombre, edad, género, celular y correo. Cada día te recordaré saludarlos hasta que los pases a prospecto.
          </div>
        )}
        {activos.map((c) => (
          <article key={c.id} className="cto">
            <div className="cto-h">
              <div>
                <h3>{c.nombre}</h3>
                {detalle(c) && <p>{detalle(c)}</p>}
              </div>
              <BotonesSaludo c={c} hoy={hoy} />
            </div>
            <p>
              {c.registrado === false && <span className="tag sin-registrar">Sin registrar: el saludo lo presenta</span>}
              {c.celular && <span>{c.celular}</span>}
              {c.correo && (
                <a {...enl.correo(c.correo.trim(), "", "")} rel="noopener noreferrer" className="cto-mail">
                  {c.correo}
                </a>
              )}
            </p>
            {c.referidor?.trim() && (
              <CadenaReferido d={datosReferido(c)} telefono={c.celular} marcar={(i, dia) => guardarCadena(c, i, dia)} />
            )}
            <p className="an-note">
              {enCadena(c)
                ? "El saludo diario empieza al terminar la cadena"
                : saludadoHoy(c, hoy)
                  ? "✓ Saludado hoy"
                  : "Pendiente de saludo hoy"}
              {c.saludos ? ` · ${c.saludos} ${c.saludos === 1 ? "saludo" : "saludos"} en total` : ""}
            </p>
            <div className="doc-acc">
              <PasarAReunion id={c.id} />
              <button type="button" className="btn ghost small" onClick={() => setEdit(c)}>
                Editar
              </button>
              <BotonConfirmar
                className="btn ghost small"
                armadoTexto="¿Borrar?"
                aria-label={`Borrar contacto ${c.nombre}`}
                onConfirm={() => {
                  void biblioteca.borrar("contactos", c.id);
                  avisar("Contacto borrado");
                }}
              >
                Borrar
              </BotonConfirmar>
            </div>
          </article>
        ))}
      </div>
      {pasados.length > 0 && (
        <>
          <button type="button" className="enlace" style={{ marginTop: 14 }} onClick={() => setVerPasados(!verPasados)}>
            {verPasados ? "Ocultar" : "Ver"} contactos ya pasados a prospecto ({pasados.length})
          </button>
          {verPasados && (
            <ul className="an-list" style={{ marginTop: 8 }}>
              {pasados.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="enlace"
                    onClick={() => c.fichaId && ir({ v: "ficha", id: c.fichaId })}
                  >
                    {c.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export function FormContacto({
  c: inicial,
  nuevo,
  alCerrar,
  alGuardar,
}: {
  c: ContactoNuevo;
  nuevo: boolean;
  alCerrar: () => void;
  alGuardar: (c: ContactoNuevo) => void;
}) {
  const [c, setC] = useState(inicial);
  const [error, setError] = useState("");
  const base = useId();
  const set = (k: keyof ContactoNuevo, v: string) => {
    setC({ ...c, [k]: v });
    setError("");
  };
  const { contactos } = useBiblioteca();
  const fichas = useFichas();
  const guardar = () => {
    const e = errorContacto(c);
    if (e) return setError(e);
    // No repetir: el celular o el correo ya están en la base (contactos o fichas).
    const ks = claves(c.celular, c.correo);
    const repetido =
      contactos.find((x) => x.id !== c.id && claves(x.celular, x.correo).some((k) => ks.includes(k)))?.nombre ??
      fichas.find((p) => p.id !== c.id && claves(txt(p, "whatsapp"), txt(p, "correo")).some((k) => ks.includes(k)))?.nombre;
    if (repetido !== undefined) return setError(`Ya está en tu base: ${String(repetido) || "sin nombre"}`);
    alGuardar(c);
  };
  const campo = (
    k: "nombre" | "edad" | "celular" | "correo",
    l: string,
    extra: Partial<React.InputHTMLAttributes<HTMLInputElement>> = {},
  ) => (
    <div className="f">
      <label htmlFor={base + k}>
        <span>{l}</span>
      </label>
      <input id={base + k} value={c[k]} onChange={(e) => set(k, e.target.value)} {...extra} />
    </div>
  );
  return (
    <section className="miss" aria-label={nuevo ? "Nuevo contacto" : "Editar contacto"} style={{ marginTop: 0 }}>
      <h2 className="sub-h">{nuevo ? "Nuevo contacto" : "Editar contacto"}</h2>
      {campo("nombre", "Nombre", { autoComplete: "off" })}
      <div className="two">
        {campo("edad", "Edad (años)", { inputMode: "numeric", type: "number", min: 0, max: 120 })}
        <div className="f">
          <label htmlFor={base + "genero"}>
            <span>Género</span>
          </label>
          <select id={base + "genero"} value={c.genero} onChange={(e) => set("genero", e.target.value as Genero)}>
            <option value="">Elegir…</option>
            {GENEROS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>
      {campo("celular", "Celular", { type: "tel", inputMode: "tel", autoComplete: "off" })}
      {campo("correo", "Correo", { type: "email", inputMode: "email", autoComplete: "off" })}
      <div className="two">
        <div className="f">
          <label htmlFor={base + "ciudad"}>
            <span>Ciudad</span>
          </label>
          <input id={base + "ciudad"} value={c.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} />
        </div>
        {!c.referidor?.trim() && (
          <div className="f">
            <label htmlFor={base + "origen"}>
              <span>Origen</span>
            </label>
            <select id={base + "origen"} value={c.origen ?? ""} onChange={(e) => set("origen", e.target.value)}>
              <option value="">Elegir…</option>
              {ORIGENES.filter((o) => o !== "Referido").map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor={base + "referidor"}>
            <span>¿Quién te lo refirió? (opcional)</span>
          </label>
          <input
            id={base + "referidor"}
            value={c.referidor ?? ""}
            autoComplete="off"
            placeholder="Nombre de quien lo refirió"
            onChange={(e) => set("referidor", e.target.value)}
          />
        </div>
        {c.referidor?.trim() && (
          <div className="f">
            <label htmlFor={base + "relacion"}>
              <span>Relación</span>
            </label>
            <select id={base + "relacion"} value={c.relacion ?? ""} onChange={(e) => set("relacion", e.target.value)}>
              <option value="">Elegir…</option>
              {RELACIONES.map((r) => (
                <option key={r.l}>{r.l}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <label className="interruptor">
        <input
          type="checkbox"
          role="switch"
          checked={c.registrado !== false}
          onChange={(e) => setC({ ...c, registrado: e.target.checked })}
        />
        <span>
          <b>{c.registrado !== false ? "Me tiene registrado" : "Sin registrar"}</b>
          <small>
            {c.registrado !== false
              ? "Tiene tu número guardado: el saludo va directo."
              : "Aún no tiene tu número: el saludo incluye una presentación breve de quién eres."}
          </small>
        </span>
      </label>
      <p className="an-note">Registra solo a quien te dio sus datos para contactarle.</p>
      {error && (
        <p className="an-status warn" role="alert" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
      <div className="actions">
        <button className="btn" onClick={guardar}>
          Guardar contacto
        </button>
        <button className="btn ghost" onClick={alCerrar}>
          Cancelar
        </button>
      </div>
    </section>
  );
}
