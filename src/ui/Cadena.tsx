/**
 * Cadena de mensajes para un referido: el asesor activa cada paso
 * ("Enviar mensaje 1", "Enviar mensaje 2"…). Al tocar WhatsApp o SMS se
 * abre el mensaje listo y el paso queda marcado con la fecha (con "Deshacer").
 */
import { useId } from "react";
import { fmtFecha, hoyISO } from "../domain/fechas";
import { telefonoDe, whatsAppDe } from "../domain/ficha";
import { pasosCadena, type DatosReferido } from "../domain/referidos";
import type { Canal } from "../domain/tipos";
import { useAjustesPerfil, useAviso, useEnlaces } from "./hooks";

export function CadenaReferido({
  d,
  telefono,
  marcar,
  alEnviar,
}: {
  d: DatosReferido;
  /** Número tal como se escribió. */
  telefono: string;
  /** Guarda el día de envío del paso `i` (null = no enviado). */
  marcar: (i: number, dia: string | null) => void;
  /** Después de enviar (p. ej. registrar en el historial). */
  alEnviar?: (canal: Canal, nota: string) => void;
}) {
  const enl = useEnlaces();
  const avisar = useAviso();
  const { perfil, ajustes } = useAjustesPerfil();
  const pasos = pasosCadena(d, perfil, ajustes);
  const wa = whatsAppDe(telefono);
  const tel = telefonoDe(telefono);
  const hoy = hoyISO();
  const idT = useId();

  const enviado = (i: number, canal: Canal) => {
    if (pasos[i].enviado) return;
    marcar(i, hoy);
    alEnviar?.(canal, `Referido: mensaje ${i + 1}`);
    avisar(`Mensaje ${i + 1} marcado como enviado`, { texto: "Deshacer", alTocar: () => marcar(i, null) });
  };

  return (
    <section className="miss cadena" aria-labelledby={idT}>
      <h2 className="sub-h" id={idT}>
        🔗 Cadena de referido
      </h2>
      <p className="an-note">
        Referido por <b>{d.referidor}</b>
        {d.relacion && ` (${d.relacion.toLowerCase()})`}. Activa cada mensaje cuando sea el momento.
      </p>
      <ol className="pasos">
        {pasos.map((p, i) => (
          <li key={p.n} className={p.enviado ? "hecho" : p.disponible ? "activo" : "bloq"}>
            <div className="paso-h">
              <span className="paso-n" aria-hidden="true">
                {p.enviado ? "✓" : p.n}
              </span>
              <b>
                Mensaje {p.n} · {p.l}
                {p.opcional && <small> (opcional)</small>}
              </b>
              <small className="paso-est">
                {p.enviado ? `Enviado ${fmtFecha(p.enviado)}` : p.disponible ? "Listo para enviar" : `Después del mensaje ${p.n - 1}`}
              </small>
            </div>
            {(p.disponible || p.enviado) && <p className="paso-txt">{p.texto}</p>}
            {p.disponible && !p.enviado && (
              <div className="envio">
                {wa && (
                  <a
                    className="btn wa-btn"
                    {...enl.wa(wa, p.texto)}
                    rel="noopener noreferrer"
                    onClick={() => enviado(i, "WhatsApp")}
                  >
                    Enviar mensaje {p.n}
                  </a>
                )}
                {tel && (
                  <a
                    className="btn sms-btn"
                    href={`sms:${tel}?body=${encodeURIComponent(p.texto)}`}
                    aria-label={`Enviar mensaje ${p.n} por SMS`}
                    onClick={() => enviado(i, "SMS")}
                  >
                    ✉️ SMS
                  </a>
                )}
                <button type="button" className="btn ghost" onClick={() => enviado(i, "Otro")}>
                  Ya lo envié
                </button>
              </div>
            )}
            {p.enviado && (
              <button type="button" className="enlace" onClick={() => marcar(i, null)}>
                Marcar como no enviado
              </button>
            )}
          </li>
        ))}
      </ol>
      {!wa && !tel && <p className="an-note">Escribe su número para enviar los mensajes.</p>}
    </section>
  );
}
