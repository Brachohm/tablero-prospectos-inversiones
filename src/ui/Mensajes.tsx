/**
 * Mensajes de seguimiento según la etapa de la ficha (los recordatorios de la
 * reunión van aparte, en "Recordatorio"). Se editan antes de enviar; al enviarlos por WhatsApp o SMS
 * quedan registrados en el historial (con "Deshacer").
 */
import { sinEmojis } from "../domain/texto";
import { useId, useState } from "react";
import { hoyISO } from "../domain/fechas";
import { etapaDe, numeroWhatsApp } from "../domain/ficha";
import { enlaceSMS, mensajesPara } from "../domain/mensajes";
import type { Prospecto } from "../domain/tipos";
import { useFichas } from "../store/store";
import { useAjustesPerfil, useAviso, useEnlaces, useRegistrar } from "./hooks";

export function Mensajes({ p }: { p: Prospecto }) {
  const enl = useEnlaces();
  const items = useFichas();
  const hoy = hoyISO();
  const { perfil } = useAjustesPerfil();
  const ms = mensajesPara(p, hoy, items, perfil).filter((m) => !m.reunion);
  const [elegido, setElegido] = useState<string | null>(null);
  // Texto editado a mano por mensaje (si no, el de la plantilla).
  const [editado, setEditado] = useState<Record<string, string>>({});
  const avisar = useAviso();
  const registrar = useRegistrar(p.id);
  const idTexto = useId();

  const actual = ms.find((m) => m.id === elegido) ?? ms[0];
  if (!actual) return null;
  const texto = editado[actual.id] ?? actual.texto;
  const wa = numeroWhatsApp(p);
  const sms = enlaceSMS(p, texto);
  const nota = actual.l;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sinEmojis(texto));
      avisar("Mensaje copiado");
    } catch {
      avisar("No se pudo copiar");
    }
  };

  return (
    <section className="miss mensajes" aria-labelledby="t-mensajes" id="mensajes">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          💬
        </span>
        <h2 id="t-mensajes">Mensajes de seguimiento</h2>
        <span className="mp">{etapaDe(p)}</span>
      </div>
      <div className="ideas" role="group" aria-label="Elegir mensaje">
        {ms.map((m) => (
          <button
            key={m.id}
            type="button"
            className="chip"
            aria-pressed={m.id === actual.id}
            onClick={() => setElegido(m.id)}
          >
            {m.l}
          </button>
        ))}
      </div>
      <div className="f" style={{ marginTop: 10 }}>
        <label htmlFor={idTexto}>
          <span>Mensaje (puedes editarlo)</span>
        </label>
        <textarea
          id={idTexto}
          rows={5}
          value={texto}
          onChange={(e) => setEditado({ ...editado, [actual.id]: e.target.value })}
        />
      </div>
      {editado[actual.id] !== undefined && editado[actual.id] !== actual.texto && (
        <button
          type="button"
          className="enlace"
          onClick={() => {
            const { [actual.id]: _, ...resto } = editado;
            setEditado(resto);
          }}
        >
          Volver al texto sugerido
        </button>
      )}
      <div className="envio">
        {wa && (
          <a
            className="btn wa-btn"
            {...enl.wa(wa, texto)}
            rel="noopener noreferrer"
            onClick={() => registrar("WhatsApp", nota, "WhatsApp")}
          >
            💬 WhatsApp
          </a>
        )}
        {sms && (
          <a className="btn sms-btn" href={sms} onClick={() => registrar("SMS", nota, "SMS")}>
            ✉️ SMS
          </a>
        )}
        <button className="btn ghost" onClick={() => void copiar()}>
          Copiar
        </button>
      </div>
      {!wa && !sms && <p className="an-note">Escribe su número en "WhatsApp" para enviarle mensajes.</p>}
    </section>
  );
}

/** Botones de la agenda para recordar la reunión por WhatsApp o SMS. */
export function BotonesRecordatorio({ p, texto }: { p: Prospecto; texto: string }) {
  const enl = useEnlaces();
  const registrar = useRegistrar(p.id);
  const wa = numeroWhatsApp(p);
  const sms = enlaceSMS(p, texto);
  const nombre = String(p.nombre ?? "").trim() || "este prospecto";
  return (
    <>
      {wa && (
        <a
          className="contacto wa"
          {...enl.wa(wa, texto)}
          rel="noopener noreferrer"
          aria-label={`Recordar la reunión por WhatsApp a ${nombre}`}
          onClick={() => registrar("WhatsApp", "Recordatorio de reunión", "WhatsApp")}
        >
          <span aria-hidden="true">💬</span>
        </a>
      )}
      {sms && (
        <a
          className="contacto sms"
          href={sms}
          aria-label={`Recordar la reunión por SMS a ${nombre}`}
          onClick={() => registrar("SMS", "Recordatorio de reunión", "SMS")}
        >
          <span aria-hidden="true">✉️</span>
        </a>
      )}
    </>
  );
}

