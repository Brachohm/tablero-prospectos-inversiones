/**
 * Centro de Gestión: los contactos y prospectos, uno por uno. En cada uno se
 * hace una gestión (llamar, saludar, seguimiento, invitación, recordatorio o
 * soltar) y no se puede seguir sin un resumen. Con el resumen, la app
 * recomienda cómo continuar.
 */
import { FormReunion } from "./Reunion";
import { useId, useState } from "react";
import { ORIGENES, TIPOS } from "../config/ficha";
import { conPresentacion, mensajeDe, primerNombre, rellenar, textoInvitacion } from "../domain/ajustes";
import { marcarSaludo, type ContactoNuevo } from "../domain/contactos";
import { registrarContactoRapido } from "../domain/crm";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { etapaDe, telefonoParaLlamar } from "../domain/ficha";
import {
  cola,
  crearGestion,
  errorGestion,
  filtrarGestion,
  gestionables,
  recomendacion,
  RESULTADO_L,
  RESULTADOS,
  ultimaGestion,
  type Filtro,
  type Gestionable,
} from "../domain/gestion";
import { enlaceSMS, recordatorioReunion, reunionDe } from "../domain/mensajes";
import { nombreReunion, numeroReunion, requiereCasoEspecial } from "../domain/cierre";
import { lugarFrase, marcarRecordatorio } from "../domain/reunion";
import { estadoSeguimiento, registrarSeguimiento, reiniciarSeguimiento } from "../domain/seguimiento";
import type { Canal, ResultadoGestion, Tipo } from "../domain/tipos";
import { biblioteca, useBiblioteca } from "../store/biblioteca";
import { store, useFichas } from "../store/store";
import { useFotoPerfil, compartirConArchivo, iconoAdjunto, useArchivoAdjunto } from "./adjuntos";
import { BotonConfirmar } from "./comunes";
import { ListaContactos, Saludos } from "./Contactos";
import { BotonesEnvio, EnviarInvitacion } from "./Envio";
import { firma } from "../domain/herramientas";
import { useAjustesPerfil, useAviso } from "./hooks";
import { ir, type ModoGestion } from "./router";

/** Guarda cambios en el contacto o en la ficha. */
/** Solo los datos del seguimiento 1-2-3 (para no copiar el resto del adaptador al contacto). */
function soloSeguimiento(g: Gestionable) {
  const f = g.ficha;
  return {
    seguimiento: Array.isArray(f.seguimiento) ? f.seguimiento : [],
    segRespondio: f.segRespondio,
    segVueltas: Array.isArray(f.segVueltas) ? f.segVueltas : [],
  };
}

function actualizarG(g: Gestionable, cambios: Record<string, unknown>) {
  if (g.tipo === "ficha") {
    store.actualizar(g.id, (x) => ({ ...x, ...cambios }));
    return;
  }
  const c = biblioteca.getEstado().contactos.find((x) => x.id === g.id);
  if (c) void biblioteca.guardar("contactos", { ...c, ...cambios } as ContactoNuevo);
}

export function GestionVista({ modo }: { modo: ModoGestion }) {
  const items = useFichas();
  const { contactos, listo } = useBiblioteca();
  const [filtro, setFiltro] = useState<Filtro>({ origen: "Todos", tipo: "todos" });
  const hoy = hoyISO();
  const todos = gestionables(items, contactos);
  const c = cola(filtrarGestion(todos, filtro), hoy);
  const actual = c.pendientes[0];
  const total = c.pendientes.length + c.hechos.length;

  const porOrigen = (o: string) => filtrarGestion(todos, { ...filtro, origen: o }).length;

  return (
    <main className="wrap page-top gestion">
      <header className="gest-top">
        <h1>Centro de Gestión</h1>
        <p>Un contacto a la vez. Termina cada gestión con un resumen.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="Modo">
        <button
          role="tab"
          className="tab"
          aria-selected={modo === "uno"}
          onClick={() => ir({ v: "gestion", modo: "uno" }, { reemplazar: true })}
        >
          Gestionar
        </button>
        <button
          role="tab"
          className="tab"
          aria-selected={modo === "contactos"}
          onClick={() => ir({ v: "gestion", modo: "contactos" }, { reemplazar: true })}
        >
          Contactos
        </button>
      </div>

      {modo === "contactos" ? (
        <>
          <Saludos hoy={hoy} />
          <ListaContactos hoy={hoy} />
        </>
      ) : (
        <>
          <div className="chips filtro-origen" role="group" aria-label="Filtrar por origen" style={{ marginTop: 14 }}>
            {["Todos", ...ORIGENES].map((o) => (
              <button
                key={o}
                className="chip"
                aria-pressed={filtro.origen === o}
                onClick={() => setFiltro({ ...filtro, origen: o })}
              >
                {o} {porOrigen(o)}
              </button>
            ))}
          </div>
          <div className="chips" role="group" aria-label="Filtrar por tipo" style={{ marginTop: 8 }}>
            {(
              [
                ["todos", "Todos"],
                ["contacto", "Contactos nuevos"],
                ["ficha", "Prospectos"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} className="chip" aria-pressed={filtro.tipo === k} onClick={() => setFiltro({ ...filtro, tipo: k })}>
                {l}
              </button>
            ))}
          </div>

          {total > 0 && (
            <div className="gest-progreso">
              <span>
                Hoy: <b>{c.hechos.length}</b> de {total} gestionados
              </span>
              <div className="mbar" aria-hidden="true">
                <i style={{ width: (c.hechos.length / total) * 100 + "%" }} />
              </div>
            </div>
          )}

          {!listo ? (
            <p className="an-note" role="status">
              Cargando…
            </p>
          ) : actual ? (
            <TarjetaGestion key={actual.id} g={actual} hoy={hoy} restantes={c.pendientes.length - 1} />
          ) : (
            <div className="empty" style={{ marginTop: 14 }}>
              <b>{total ? "¡Terminaste por hoy! 🎉" : "No hay contactos para gestionar"}</b>
              {total
                ? "Gestionaste a todos los de este filtro. Mañana vuelven los que siguen en proceso."
                : "Agrega contactos en la pestaña Contactos o carga tu base de datos."}
              {!total && (
                <div className="actions" style={{ justifyContent: "center" }}>
                  <button className="btn small" onClick={() => ir({ v: "base" })}>
                    Cargar base de datos
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </main>
  );
}

type Panel = null | "saludo" | "seguimiento" | "invitacion" | "recordatorio" | "reunion" | "pasar";

const TIPO_REUNION: Record<Tipo, string> = { nuevo: "Nuevo cliente", cambio: "Cambio de seguro" };

/** Texto con el que cada acción queda en "Hecho en esta gestión". */
const MARCA_ACCION: Record<string, string> = {
  llamar: "Llamada",
  saludo: "Saludo",
  seguimiento: "Seguimiento",
  invitacion: "Invitación",
  recordatorio: "Recordatorio",
  reunion: "Reunión",
  pasar: "Pasó a reunión",
};

const NIVEL_REC: Record<string, { cls: string; ic: string }> = {
  inicio: { cls: "inicio", ic: "👋" },
  seguir: { cls: "seguir", ic: "➡️" },
  cerrar: { cls: "cerrar", ic: "🎯" },
  soltar: { cls: "soltar", ic: "🏁" },
};

function TarjetaGestion({ g, hoy, restantes }: { g: Gestionable; hoy: string; restantes: number }) {
  const avisar = useAviso();
  const { ajustes, perfil } = useAjustesPerfil();
  const [panel, setPanel] = useState<Panel>(null);
  const [hechas, setHechas] = useState<string[]>([]);
  const [resultado, setResultado] = useState<ResultadoGestion | null>(null);
  const [resumen, setResumen] = useState("");
  const [error, setError] = useState("");
  const idRes = useId();

  const ult = ultimaGestion(g);
  const rec = recomendacion(g, hoy);
  const seg = estadoSeguimiento(g.ficha, hoy);
  const reu = reunionDe(g.ficha, hoy);
  const tel = telefonoParaLlamar(g.ficha);
  const vars = {
    nombre: primerNombre(g.nombre),
    asesor: perfil.apodo,
    rol: perfil.rol,
    fecha: reu?.cuando ?? "",
    hora: reu?.hora ?? "",
    lugar: reu ? lugarFrase(g.ficha) : "",
  };
  const hecho = (a: string) => setHechas((x) => (x.includes(a) ? x : [...x, a]));

  /** Guarda la gestión (con resultado y resumen obligatorios). Devuelve false si falta algo. */
  const guardar = (soltar: boolean, res: ResultadoGestion | null = resultado, acciones: string[] = hechas) => {
    const e = errorGestion(resumen, res);
    if (e) {
      setError(e);
      document.getElementById(idRes)?.focus();
      return false;
    }
    const gest = crearGestion(res!, resumen, acciones, hoy);
    const cambios: Record<string, unknown> = { gestiones: [...g.gestiones, gest] };
    if (soltar) cambios.soltado = { fecha: hoy, motivo: resumen.trim() };
    if (g.tipo === "ficha") {
      const canal: Canal = hechas.includes("Llamada") ? "Llamada" : hechas.length ? "WhatsApp" : "Otro";
      store.actualizar(g.id, (x) =>
        registrarContactoRapido(
          { ...x, ...cambios },
          canal,
          hoy,
          gest.ts,
          `Gestión · ${RESULTADO_L[gest.resultado]}: ${gest.resumen}`,
        ).ficha,
      );
    } else actualizarG(g, cambios);
    return true;
  };

  const terminar = (soltar: boolean) => {
    if (!guardar(soltar)) return;
    window.scrollTo(0, 0);
    avisar(soltar ? `${g.nombre} quedó fuera de gestión (sigue en tu base de datos)` : "Gestión guardada");
  };

  /** Pasar a reunión: guarda la gestión y abre la ficha del tipo elegido. */
  const pasar = (tipo: Tipo) => {
    if (!guardar(false, resultado ?? "reunion", [...hechas, `Pasó a reunión (${TIPO_REUNION[tipo]})`])) return;
    if (g.tipo === "ficha") {
      store.actualizar(g.id, (x) => ({ ...x, tipo, ...(["Primer contacto", "Cuadrar cita"].includes(etapaDe(x)) ? { etapa: "Primera reunión" } : {}) }));
      ir({ v: "ficha", id: g.id });
    } else ir({ v: "nueva", tipo, contacto: g.id });
    avisar(`${TIPOS[tipo].ic} ${TIPO_REUNION[tipo]}: completa su ficha para la reunión`);
  };

  const acciones: { id: Panel | "llamar" | "ficha"; ic: string; l: string; off?: boolean; nota?: string }[] = [
    { id: "llamar", ic: "📞", l: "Llamar", off: !tel },
    { id: "saludo", ic: "👋", l: "Saludo" },
    {
      id: "seguimiento",
      ic: "🔁",
      l: seg.siguiente !== null ? `Seguimiento ${seg.siguiente + 1}` : "Seguimiento",
      nota: seg.siguiente === null ? "completo" : seg.hoy ? "hoy" : "aún no",
    },
    { id: "invitacion", ic: "✉️", l: "Invitación" },
    { id: "recordatorio", ic: "⏰", l: "Recordatorio", off: !(reu && reu.dias >= 0) },
    { id: "reunion", ic: "🗓️", l: reu && reu.dias >= 0 ? "Cambiar reunión" : "Agendar reunión" },
    { id: "pasar", ic: "🤝", l: "Pasar a reunión" },
    ...(g.tipo === "ficha" ? [{ id: "ficha" as const, ic: "📄", l: "Abrir ficha" }] : []),
  ];

  return (
    <article className="gest-card" aria-label={`Gestión de ${g.nombre}`}>
      <div className="gc-head">
        <span className="avatar" aria-hidden="true">
          {(g.nombre.trim()[0] ?? "?").toUpperCase()}
        </span>
        <div>
          <h2>{g.nombre || "Sin nombre"}</h2>
          <div className="tags">
            <span className="tag">{g.origen}</span>
            <span className={"tag " + (g.tipo === "ficha" ? "t-cambio" : "t-nuevo")}>
              {g.tipo === "ficha" ? `Prospecto · ${g.etapa}` : "Contacto nuevo"}
            </span>
          </div>
        </div>
        <span className="quedan">{restantes > 0 ? `+${restantes} en cola` : "último"}</span>
      </div>

      <dl className="gc-datos">
        {g.edad && (
          <div>
            <dt>Edad</dt>
            <dd>{g.edad} años</dd>
          </div>
        )}
        {g.ciudad && (
          <div>
            <dt>Ciudad</dt>
            <dd>{g.ciudad}</dd>
          </div>
        )}
        {g.telefono && (
          <div>
            <dt>Celular</dt>
            <dd>{g.telefono}</dd>
          </div>
        )}
        {g.correo && (
          <div className="ancho">
            <dt>Correo</dt>
            <dd>{g.correo}</dd>
          </div>
        )}
        {g.referidor && (
          <div className="ancho">
            <dt>Referido por</dt>
            <dd>
              {g.referidor}
              {g.relacion && ` (${g.relacion.toLowerCase()})`}
            </dd>
          </div>
        )}
      </dl>

      <section className="gc-estado" aria-label="Estado">
        <h3>Estado</h3>
        <ul>
          <li>
            {ult ? (
              <>
                Última gestión {fmtFecha(ult.fecha)}: <b>{RESULTADO_L[ult.resultado]}</b>
                <q>{ult.resumen}</q>
              </>
            ) : (
              "Aún sin gestiones"
            )}
          </li>
          <li>
            {g.gestiones.length} {g.gestiones.length === 1 ? "gestión" : "gestiones"} · Seguimiento {seg.enviados.length}/3
            {seg.respondio && " · respondió"}
          </li>
          {reu && reu.dias >= 0 && (
            <li>
              🗓️ Reunión {reu.cuando}
              {reu.hora && ` a las ${reu.hora}`}
              {reu.lugar && ` · ${reu.lugar}`}
            </li>
          )}
        </ul>
      </section>

      <section className={"gc-rec " + NIVEL_REC[rec.nivel].cls} aria-label="Recomendación">
        <span className="vl">
          {NIVEL_REC[rec.nivel].ic} {rec.nivel === "soltar" ? "Dar fin" : rec.nivel === "cerrar" ? "Ir al cierre" : rec.nivel === "inicio" ? "Empezar" : "Continuar"}
          {rec.posibilidad !== "sin datos" && ` · posibilidad ${rec.posibilidad}`}
        </span>
        <b>{rec.titulo}</b>
        <ul>
          {rec.pasos.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </section>

      <h3 className="gc-sub">Acciones</h3>
      <div className="gc-acciones">
        {acciones.map((a) => {
          const activo = panel === a.id;
          const marca = MARCA_ACCION[a.id ?? ""];
          const hechoYa = !!marca && hechas.some((h) => h.startsWith(marca));
          const cls = "gc-acc" + (activo ? " on" : "") + (hechoYa ? " hecho" : "");
          if (a.id === "llamar")
            return tel ? (
              <a key="llamar" className={cls} href={"tel:" + tel} onClick={() => hecho("Llamada")}>
                <span aria-hidden="true">{a.ic}</span>
                {a.l}
              </a>
            ) : (
              <button key="llamar" className={cls} disabled>
                <span aria-hidden="true">{a.ic}</span>
                {a.l}
              </button>
            );
          if (a.id === "ficha")
            return (
              <button
                key="ficha"
                className={cls}
                onClick={() => ir({ v: "ficha", id: g.id })}
              >
                <span aria-hidden="true">{a.ic}</span>
                {a.l}
              </button>
            );
          return (
            <button
              key={a.id}
              className={cls}
              disabled={a.off}
              aria-expanded={activo}
              onClick={() => setPanel(activo ? null : (a.id as Panel))}
            >
              <span aria-hidden="true">{a.ic}</span>
              {a.l}
              {a.nota && <small>{a.nota}</small>}
            </button>
          );
        })}
      </div>

      {panel === "saludo" && <PanelSaludo g={g} hoy={hoy} vars={vars} alEnviar={(a) => hecho(a)} />}
      {panel === "seguimiento" && <PanelSeguimiento g={g} hoy={hoy} vars={vars} alEnviar={(a) => hecho(a)} />}
      {panel === "invitacion" && (
        <PanelTexto
          g={g}
          titulo="Invitación a la reunión"
          texto={textoInvitacion(mensajeDe(ajustes, "invitacion").texto, vars, !!(reu && reu.dias >= 0))}
          clave="invitacion"
          aviso={reu && reu.dias >= 0 ? "" : "Aún no hay reunión agendada: la invitación le pregunta qué día y a qué hora puede."}
          correo={g.correo}
          alEnviar={() => hecho("Invitación")}
        />
      )}
      {panel === "recordatorio" && reu && (
        <PanelRecordatorio g={g} texto={recordatorioReunion(g.ficha, hoy, perfil) ?? ""} alEnviar={() => {
            hecho("Recordatorio");
            actualizarG(g, marcarRecordatorio(g.ficha, 1));
          }} />
      )}
      {panel === "pasar" && (
        <div className="gc-panel" aria-label="Pasar a reunión">
          <p className="an-note">
            ¿Qué necesita? Se guarda esta gestión con tu resumen y se abre su ficha
            {g.tipo === "contacto" ? " con sus datos" : ""}.
          </p>
          <div className="pasar-opc">
            {(["nuevo", "cambio"] as const).map((t) => (
              <button
                key={t}
                type="button"
                className={"mode " + (t === "nuevo" ? "n" : "c") + (g.tipo === "ficha" && g.ficha.tipo === t ? " actual" : "")}
                onClick={() => pasar(t)}
              >
                <span className="ico" aria-hidden="true">
                  {TIPOS[t].ic}
                </span>
                <b>{TIPO_REUNION[t]}</b>
                <small>{TIPOS[t].desc}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {panel === "reunion" && (
        <PanelReunion
          g={g}
          alGuardar={() => {
            hecho("Reunión agendada");
            setPanel("invitacion");
            if (!resultado) setResultado("reunion");
          }}
        />
      )}

      {hechas.length > 0 && <p className="gc-hechas">Hecho en esta gestión: {hechas.join(" · ")}</p>}

      <section className="gc-cierre" aria-label="Resumen de la gestión">
        <h3>¿Cómo terminó?</h3>
        <div className="mchips" role="group" aria-label="Resultado de la gestión">
          {RESULTADOS.map((r) => (
            <button
              key={r.id}
              type="button"
              className="mc"
              aria-pressed={resultado === r.id}
              onClick={() => {
                setResultado(r.id);
                setError("");
              }}
            >
              <span aria-hidden="true">{r.ic}</span> {r.l}
            </button>
          ))}
        </div>
        <label htmlFor={idRes} className="gc-label">
          Resumen de la gestión <small>(obligatorio para continuar)</small>
        </label>
        <textarea
          id={idRes}
          rows={4}
          value={resumen}
          placeholder="¿Qué pasó? ¿Qué dijo? ¿Qué quedó pendiente?"
          onChange={(e) => {
            setResumen(e.target.value);
            setError("");
          }}
        />
        {error && (
          <p className="an-status warn" role="alert">
            {error}
          </p>
        )}
        <div className="gc-botones">
          <BotonConfirmar
            className="btn ghost soltar-btn"
            armadoTexto="¿Soltar? Toca otra vez"
            onConfirm={() => terminar(true)}
          >
            🏁 Soltar contacto
          </BotonConfirmar>
          <button className="btn siguiente" onClick={() => terminar(false)}>
            Guardar y siguiente →
          </button>
        </div>
      </section>
    </article>
  );
}

type Vars = Record<string, string>;

function PanelSaludo({ g, hoy, vars, alEnviar }: { g: Gestionable; hoy: string; vars: Vars; alEnviar: (a: string) => void }) {
  const { ajustes } = useAjustesPerfil();
  const avisar = useAviso();
  const video = mensajeDe(ajustes, "saludoVideo");
  const foto = mensajeDe(ajustes, "saludoFoto");
  const fVideo = useArchivoAdjunto("saludoVideo", video.adjunto);
  const fFoto = useArchivoAdjunto("saludoFoto", foto.adjunto);
  // Sin tu número registrado: el saludo de texto va con tu foto (si la subiste).
  const fotoYo = useFotoPerfil();
  const archivoTexto = g.registrado === false ? fotoYo : null;
  // Sin tu número registrado: el saludo lleva tu presentación breve.
  const presentar = (t: string) =>
    g.registrado === false ? conPresentacion(t, rellenar(mensajeDe(ajustes, "presentacion").texto, vars), vars.asesor ?? "") : t;
  const texto = presentar(rellenar(mensajeDe(ajustes, "saludoTexto").texto, vars));
  const marcar = (a: string) => {
    alEnviar(a);
    if (g.tipo === "contacto") {
      const c = biblioteca.getEstado().contactos.find((x) => x.id === g.id);
      if (c) void biblioteca.guardar("contactos", marcarSaludo(c, hoy));
    }
  };
  const compartir = async (f: File, t: string, a: string) => {
    const r = await compartirConArchivo(t, f);
    if (r === "cancelado") return;
    marcar(a);
    if (r === "descargado") avisar("Texto copiado y archivo descargado: adjúntalo en WhatsApp");
  };
  if (g.referidor && g.tipo === "contacto")
    return (
      <div className="gc-panel">
        <p className="an-note">
          Es un referido: preséntate con su cadena de mensajes (pestaña Contactos), no con el saludo general.
        </p>
      </div>
    );
  return (
    <div className="gc-panel" aria-label="Saludo">
      <p className="paso-txt">{texto}</p>
      <BotonesEnvio
        p={g.ficha}
        texto={texto}
        archivo={archivoTexto}
        alEnviar={() => marcar(archivoTexto ? "Saludo con su presentación y foto" : "Saludo")}
        etiqueta={archivoTexto ? "Saludo con su presentación y foto" : "Saludo de texto"}
      />
      <div className="envio">
        {fFoto && (
          <button className="btn wa-btn" onClick={() => void compartir(fFoto, presentar(rellenar(foto.texto, vars)), "Saludo con foto")}>
            📷 Con foto
          </button>
        )}
        {fVideo && (
          <button className="btn wa-btn" onClick={() => void compartir(fVideo, presentar(rellenar(video.texto, vars)), "Saludo con video")}>
            🎬 Con video
          </button>
        )}
      </div>
    </div>
  );
}

function PanelSeguimiento({
  g,
  hoy,
  vars,
  alEnviar,
}: {
  g: Gestionable;
  hoy: string;
  vars: Vars;
  alEnviar: (a: string) => void;
}) {
  const { ajustes } = useAjustesPerfil();
  const e = estadoSeguimiento(g.ficha, hoy);
  const clave = (["seg1", "seg2", "seg3"] as const)[e.siguiente ?? 0];
  const msj = mensajeDe(ajustes, clave);
  const archivo = useArchivoAdjunto(clave, msj.adjunto);
  const texto = rellenar(msj.texto, vars);
  if (e.siguiente === null)
    return (
      <div className="gc-panel">
        <p className="an-note">{e.respondio ? "Contestó: el seguimiento se detuvo." : "Ya enviaste los 3 mensajes de seguimiento."}</p>
        {e.respondio && (
          <button type="button" className="btn small" onClick={() => actualizarG(g, { ...reiniciarSeguimiento(soloSeguimiento(g)) })}>
            Enviar de nuevo el mensaje 1
          </button>
        )}
      </div>
    );
  return (
    <div className="gc-panel" aria-label="Seguimiento">
      <p className="an-note">
        Mensaje {e.siguiente + 1} de 3 · van el día 1, el 3 y el 5 (lunes a sábado).
      </p>
      <p className="paso-txt">{texto}</p>
      {msj.adjunto && (
        <p className="an-note">
          {iconoAdjunto(msj.adjunto.tipo)} Con adjunto: {msj.adjunto.nombre}
        </p>
      )}
      {e.hoy ? (
        <BotonesEnvio
          p={g.ficha}
          texto={texto}
          archivo={archivo}
          etiqueta={`Enviar mensaje ${e.siguiente + 1}`}
          alEnviar={() => {
            const n = registrarSeguimiento(g.ficha, hoy);
            if (n === g.ficha) return;
            actualizarG(g, { seguimiento: n.seguimiento });
            alEnviar(`Seguimiento ${e.siguiente! + 1}`);
          }}
        />
      ) : (
        <p className="an-status warn">
          {e.motivo}
          {e.desde && ` · El mensaje ${e.siguiente + 1} se puede enviar ${e.desde === hoy ? "hoy" : "el " + fmtFecha(e.desde)}`}
        </p>
      )}
      {e.enviados.length > 0 && (
        <button
          type="button"
          className="btn ghost small"
          style={{ marginTop: 8 }}
          onClick={() => actualizarG(g, { segRespondio: hoy })}
        >
          ✓ Contestó
        </button>
      )}
    </div>
  );
}

function PanelTexto({
  g,
  titulo,
  texto,
  clave,
  aviso,
  correo,
  alEnviar,
}: {
  g: Gestionable;
  titulo: string;
  texto: string;
  clave: "invitacion";
  aviso: string;
  correo: string;
  alEnviar: () => void;
}) {
  const { ajustes, perfil } = useAjustesPerfil();
  const msj = mensajeDe(ajustes, clave);
  const archivo = useArchivoAdjunto(clave, msj.adjunto);
  const asunto = `Invitación a reunión con ${perfil.apodo}`;
  return (
    <div className="gc-panel" aria-label={titulo}>
      {aviso && <p className="an-status warn">{aviso}</p>}
      <p className="paso-txt">{texto}</p>
      <EnviarInvitacion
        p={g.ficha}
        texto={texto}
        archivo={archivo}
        correo={correo}
        asunto={asunto}
        cuerpoCorreo={`${texto}\n\n${firma(perfil)}`}
        alEnviar={() => alEnviar()}
      />
    </div>
  );
}

function PanelRecordatorio({ g, texto, alEnviar }: { g: Gestionable; texto: string; alEnviar: () => void }) {
  const sms = enlaceSMS(g.ficha, texto);
  return (
    <div className="gc-panel" aria-label="Recordatorio de reunión">
      <p className="paso-txt">{texto}</p>
      <BotonesEnvio p={g.ficha} texto={texto} archivo={null} alEnviar={alEnviar} />
      {sms && (
        <div className="envio">
          <a className="btn sms-btn" href={sms} onClick={alEnviar}>
            ✉️ SMS
          </a>
        </div>
      )}
    </div>
  );
}

function PanelReunion({ g, alGuardar }: { g: Gestionable; alGuardar: () => void }) {
  const avisar = useAviso();
  const n = numeroReunion(g.ficha);
  return (
    <FormReunion
      datos={g.ficha}
      titulo={nombreReunion(n)}
      especial={g.tipo === "ficha" && requiereCasoEspecial(g.ficha)}
      alGuardar={(cambios) => {
        actualizarG(g, cambios);
        avisar("Reunión agendada: ahora envía la invitación");
        alGuardar();
      }}
    />
  );
}
