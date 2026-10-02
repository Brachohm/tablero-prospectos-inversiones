/**
 * Envío de los mensajes de la Configuración desde la ficha:
 * - Seguimiento 1-2-3 (día 1, 3 y 5, de lunes a sábado; si contesta, se puede empezar de nuevo).
 * - Invitación a la reunión, por WhatsApp o por correo.
 * El texto se escribe solo con el nombre del prospecto. Con adjunto, se usa
 * el menú de compartir del teléfono (ahí se elige WhatsApp y el chat).
 */
import { lugarFrase } from "../domain/reunion";
import { useState } from "react";
import { mensajeDe, primerNombre, rellenar, textoInvitacion, type ClaveMensaje } from "../domain/ajustes";
import { registrarContactoRapido } from "../domain/crm";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { numeroWhatsApp, txt } from "../domain/ficha";
import { reunionDe } from "../domain/mensajes";
import {
  deshacerSeguimiento,
  estadoSeguimiento,
  marcarRespondio,
  PASOS_SEGUIMIENTO,
  registrarSeguimiento,
  reiniciarSeguimiento,
} from "../domain/seguimiento";
import type { Canal, Prospecto } from "../domain/tipos";
import { store } from "../store/store";
import { compartirConArchivo, iconoAdjunto, useArchivoAdjunto } from "./adjuntos";
import { firma } from "../domain/herramientas";
import { useAjustesPerfil, useAviso, useEnlaces } from "./hooks";
import { ir } from "./router";

/** Botones para enviar un texto (y su adjunto, si hay). `alEnviar` se llama al tocar. */
export function BotonesEnvio({
  p,
  texto,
  archivo,
  alEnviar,
  etiqueta = "WhatsApp",
}: {
  p: Prospecto;
  texto: string;
  archivo: File | null;
  alEnviar: (canal: Canal) => void;
  etiqueta?: string;
}) {
  const enl = useEnlaces();
  const avisar = useAviso();
  const wa = numeroWhatsApp(p);
  const compartir = async () => {
    if (!archivo) return;
    const r = await compartirConArchivo(texto, archivo);
    if (r === "cancelado") return;
    alEnviar("WhatsApp");
    avisar(
      r === "compartido"
        ? "Elige WhatsApp y el chat. El texto también quedó copiado"
        : "Texto copiado y archivo descargado: adjúntalo en WhatsApp",
    );
  };
  return (
    <div className="envio">
      {archivo && (
        <button type="button" className="btn wa-btn" onClick={() => void compartir()}>
          {iconoAdjunto(archivo.type)} {etiqueta} con adjunto
        </button>
      )}
      {wa && (
        <a
          className={"btn " + (archivo ? "ghost" : "wa-btn")}
          {...enl.wa(wa, texto)}
          rel="noopener noreferrer"
          onClick={() => alEnviar("WhatsApp")}
        >
          {archivo ? "Solo texto" : `💬 ${etiqueta}`}
        </a>
      )}
    </div>
  );
}

function variablesFicha(p: Prospecto, hoy: string, apodo: string, rol: string): Record<string, string> {
  const r = reunionDe(p, hoy);
  return {
    nombre: primerNombre(txt(p, "nombre")),
    asesor: apodo,
    rol,
    fecha: r ? r.cuando : "",
    hora: r?.hora ?? "",
    lugar: r ? lugarFrase(p) : "",
  };
}

const CLAVES_SEG: ClaveMensaje[] = ["seg1", "seg2", "seg3"];

/** Seguimiento 1-2-3 de la ficha. */
export function SeguimientoAuto({ p }: { p: Prospecto }) {
  const { ajustes, perfil } = useAjustesPerfil();
  const avisar = useAviso();
  const hoy = hoyISO();
  const e = estadoSeguimiento(p, hoy);
  const sig = e.siguiente;
  const clave = sig !== null ? CLAVES_SEG[sig] : "seg1";
  const msj = mensajeDe(ajustes, clave);
  const archivo = useArchivoAdjunto(clave, msj.adjunto);
  const texto = rellenar(msj.texto, variablesFicha(p, hoy, perfil.apodo, perfil.rol));

  const enviado = (canal: Canal) => {
    if (sig === null) return;
    // Regla: un mensaje por día (se revisa de nuevo al momento de tocar).
    const actual = store.get(p.id);
    if (!actual || !estadoSeguimiento(actual, hoy).hoy) return;
    store.actualizar(p.id, (x) =>
      registrarContactoRapido(registrarSeguimiento(x, hoy), canal, hoy, Date.now(), `Seguimiento: mensaje ${sig + 1}`).ficha,
    );
    avisar(`Mensaje ${sig + 1} de seguimiento registrado`, {
      texto: "Deshacer",
      alTocar: () => store.actualizar(p.id, (x) => deshacerSeguimiento(x, hoy)),
    });
  };

  return (
    <section className="miss seguimiento-auto" aria-labelledby="t-seg-auto">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          🔁
        </span>
        <h2 id="t-seg-auto">Seguimiento 1·2·3</h2>
        <span className="mp">
          {e.enviados.length}/{PASOS_SEGUIMIENTO}
        </span>
      </div>
      <ol className="seg-pasos" aria-label="Mensajes de seguimiento">
        {CLAVES_SEG.map((c, i) => (
          <li key={c} className={e.enviados[i] ? "hecho" : i === sig ? "activo" : ""}>
            <b>Mensaje {i + 1}</b>
            <small>
              {e.enviados[i] ? `Enviado ${fmtFecha(e.enviados[i])}` : i === sig && e.desde ? (e.hoy ? "Hoy" : fmtFecha(e.desde)) : "—"}
            </small>
          </li>
        ))}
      </ol>
      {e.respondio ? (
        <>
          <p className="an-status">✓ Contestó el {fmtFecha(e.respondio)}: el seguimiento se detuvo.</p>
          <button
            type="button"
            className="btn small"
            style={{ marginTop: 8 }}
            onClick={() => {
              store.actualizar(p.id, (x) => reiniciarSeguimiento(x));
              avisar("Listo: puedes enviar otra vez el mensaje 1");
            }}
          >
            Enviar de nuevo el mensaje 1
          </button>
        </>
      ) : sig === null ? (
        <p className="an-note">Ya enviaste los 3 mensajes. Si no responde, considera darlo por perdido o retomarlo más adelante.</p>
      ) : (
        <>
          <p className="paso-txt">{texto}</p>
          {msj.adjunto && (
            <p className="an-note">
              {iconoAdjunto(msj.adjunto.tipo)} Con adjunto: {msj.adjunto.nombre}
            </p>
          )}
          {e.hoy ? (
            <BotonesEnvio p={p} texto={texto} archivo={archivo} alEnviar={enviado} etiqueta={`Enviar mensaje ${sig + 1}`} />
          ) : (
            <p className="an-status warn">
              {e.motivo}
              {e.desde && ` · El mensaje ${sig + 1} se puede enviar ${e.desde === hoy ? "hoy" : "el " + fmtFecha(e.desde)}`}
            </p>
          )}
        </>
      )}
      <div className="doc-acc">
        {!e.respondio && (e.enviados.length > 0 || sig !== null) && (
          <button
            type="button"
            className="btn ghost small"
            onClick={() => {
              store.actualizar(p.id, (x) => marcarRespondio(x, hoy));
              avisar("Contestó: el seguimiento se detuvo (puedes empezar de nuevo con el mensaje 1)");
            }}
          >
            ✓ Contestó
          </button>
        )}
        <button type="button" className="btn ghost small" onClick={() => ir({ v: "ajustes", sec: "seguimiento" })}>
          Editar mensajes
        </button>
      </div>
    </section>
  );
}

function descargarArchivo(f: File) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(f);
  a.download = f.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

/**
 * Enviar la invitación por WhatsApp, por correo o por ambos. "Ambos" envía
 * primero por WhatsApp y deja listo el paso 2 (el correo): el navegador pide
 * un segundo toque para abrir otra herramienta.
 */
export function EnviarInvitacion({
  p,
  texto,
  archivo,
  correo,
  asunto,
  cuerpoCorreo,
  alEnviar,
}: {
  p: Prospecto;
  texto: string;
  archivo: File | null;
  correo: string;
  asunto: string;
  cuerpoCorreo: string;
  alEnviar: (canal: Canal) => void;
}) {
  const enl = useEnlaces();
  const avisar = useAviso();
  const [faltaCorreo, setFaltaCorreo] = useState(false);
  const wa = numeroWhatsApp(p);
  const enlaceWa = wa ? enl.wa(wa, texto) : null;
  const enlaceCorreo = correo ? enl.correo(correo, asunto, cuerpoCorreo) : null;

  /** Paso WhatsApp: con adjunto, por el menú de compartir; si no, abre el chat. Devuelve si se hizo. */
  const porWhatsApp = async (abrirChat: boolean): Promise<boolean> => {
    if (archivo) {
      const r = await compartirConArchivo(texto, archivo);
      if (r === "cancelado") return false;
      avisar(
        r === "compartido"
          ? "Elige WhatsApp y el chat. El texto también quedó copiado"
          : "Texto copiado y archivo descargado: adjúntalo en WhatsApp",
      );
    } else if (abrirChat && enlaceWa) window.open(enlaceWa.href, enlaceWa.target ?? "_blank", "noopener");
    alEnviar("WhatsApp");
    return true;
  };

  const porCorreo = () => {
    if (archivo) {
      descargarArchivo(archivo);
      avisar("Se abrió tu correo y se descargó el adjunto: agrégalo antes de enviar");
    }
    alEnviar("Correo");
  };

  return (
    <>
      <div className="envio envio-informe" role="group" aria-label="Enviar la invitación">
        {archivo || !enlaceWa ? (
          <button type="button" className="btn wa-btn" disabled={!wa && !archivo} onClick={() => void porWhatsApp(false)}>
            💬 WhatsApp
          </button>
        ) : (
          <a className="btn wa-btn" {...enlaceWa} rel="noopener noreferrer" onClick={() => alEnviar("WhatsApp")}>
            💬 WhatsApp
          </a>
        )}
        {enlaceCorreo ? (
          <a className="btn sms-btn" {...enlaceCorreo} rel="noopener noreferrer" onClick={porCorreo}>
            📧 Correo
          </a>
        ) : (
          <button type="button" className="btn sms-btn" disabled>
            📧 Correo
          </button>
        )}
        <button
          type="button"
          className="btn ambos-btn"
          disabled={!enlaceCorreo || (!wa && !archivo)}
          onClick={() => void porWhatsApp(true).then((ok) => ok && setFaltaCorreo(true))}
        >
          📨 Ambos
        </button>
      </div>
      {faltaCorreo && enlaceCorreo && (
        <div className="paso-correo" role="status">
          <span>✓ WhatsApp listo. Paso 2 de 2:</span>
          <a
            className="btn sms-btn"
            {...enlaceCorreo}
            rel="noopener noreferrer"
            onClick={() => {
              setFaltaCorreo(false);
              porCorreo();
            }}
          >
            📧 Enviar por correo
          </a>
        </div>
      )}
      {archivo && enlaceWa && (
        <a className="enlace solo-texto" {...enlaceWa} rel="noopener noreferrer" onClick={() => alEnviar("WhatsApp")}>
          Enviar solo el texto por WhatsApp
        </a>
      )}
      {!correo && <p className="an-note">Escribe su correo en sus datos para enviarla también por correo.</p>}
    </>
  );
}

/** Invitación a la reunión: por WhatsApp o por correo. */
export function Invitacion({ p }: { p: Prospecto }) {
  const { ajustes, perfil } = useAjustesPerfil();
  const avisar = useAviso();
  const hoy = hoyISO();
  const msj = mensajeDe(ajustes, "invitacion");
  const archivo = useArchivoAdjunto("invitacion", msj.adjunto);
  const r = reunionDe(p, hoy);
  const agendada = !!(r && r.dias >= 0);
  const texto = textoInvitacion(msj.texto, variablesFicha(p, hoy, perfil.apodo, perfil.rol), agendada);
  const correo = txt(p, "correo");

  const registrar = (canal: Canal) => {
    store.actualizar(p.id, (x) => registrarContactoRapido(x, canal, hoy, Date.now(), "Invitación a reunión").ficha);
    avisar(`Invitación por ${canal === "Correo" ? "correo" : "WhatsApp"} registrada`);
  };

  const asunto = `Invitación a reunión${perfil.apodo ? " con " + perfil.apodo : ""}`;

  return (
    <section className="miss invitacion" aria-labelledby="t-invitacion">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          ✉️
        </span>
        <h2 id="t-invitacion">Invitación a la reunión</h2>
      </div>
      {!agendada && (
        <p className="an-note">Aún no hay reunión agendada: la invitación le pregunta qué día y a qué hora puede.</p>
      )}
      <p className="paso-txt">{texto}</p>
      {msj.adjunto && (
        <p className="an-note">
          {iconoAdjunto(msj.adjunto.tipo)} Con adjunto: {msj.adjunto.nombre}
        </p>
      )}
      <EnviarInvitacion
        p={p}
        texto={texto}
        archivo={archivo}
        correo={correo}
        asunto={asunto}
        cuerpoCorreo={`${texto}\n\n${firma(perfil)}`}
        alEnviar={registrar}
      />
      <div className="doc-acc">
        <button type="button" className="btn ghost small" onClick={() => ir({ v: "ajustes", sec: "invitacion" })}>
          Editar invitación
        </button>
      </div>
    </section>
  );
}
