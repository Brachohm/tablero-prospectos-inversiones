/**
 * Reuniones: formulario para agendar (presencial, Zoom o Google Meet, con su
 * link) que además abre Google Calendar con el evento lleno, y el panel de
 * Recordatorio (confirmar, recordar hoy o reprogramar por WhatsApp o SMS).
 */
import { useId, useState } from "react";
import { MODOS_REUNION, type ModoReunion } from "../config/reunion";
import { hoyISO } from "../domain/fechas";
import { numeroWhatsApp } from "../domain/ficha";
import { enlaceSMS, mensajesPara, reunionDe, textoRecordatorio2 } from "../domain/mensajes";
import {
  enlaceCalendar,
  errorReunion,
  esVirtual,
  estadoRecordatorios,
  horaDe,
  linkDe,
  lugarTexto,
  marcarRecordatorio,
  modoDe,
  type DatosReunion,
} from "../domain/reunion";
import { sinEmojis } from "../domain/texto";
import type { Prospecto } from "../domain/tipos";
import { useFichas } from "../store/store";
import { useAhora, useAjustesPerfil, useAviso, useEnlaces, useRegistrar } from "./hooks";

const CLAVE_CALENDAR = "tablero:calendar-auto";

function leerAuto(): boolean {
  try {
    return localStorage.getItem(CLAVE_CALENDAR) !== "no";
  } catch {
    return true;
  }
}

function guardarAuto(v: boolean) {
  try {
    localStorage.setItem(CLAVE_CALENDAR, v ? "si" : "no");
  } catch {
    /* sin almacenamiento: solo por esta vez */
  }
}

/**
 * Formulario de la reunión. Al guardar devuelve los cambios (reunion,
 * reunionModo, reunionLugar, reunionLink y, si es caso especial, el motivo) y
 * abre Google Calendar si está marcado.
 */
export function FormReunion({
  datos,
  titulo,
  especial = false,
  alGuardar,
}: {
  datos: DatosReunion;
  titulo: string;
  especial?: boolean;
  alGuardar: (cambios: Record<string, string>) => void;
}) {
  const { perfil } = useAjustesPerfil();
  const avisar = useAviso();
  const id = useId();
  const [fecha, setFecha] = useState(String(datos.reunion ?? ""));
  const [modo, setModo] = useState<ModoReunion>(modoDe(datos));
  const [lugar, setLugar] = useState(/^https?:\/\//i.test(String(datos.reunionLugar ?? "")) ? "" : String(datos.reunionLugar ?? ""));
  const [link, setLink] = useState(linkDe(datos));
  const [motivo, setMotivo] = useState(String(datos.reunionExtra ?? ""));
  const [calendar, setCalendar] = useState(leerAuto);

  const guardar = () => {
    const e = errorReunion(fecha, modo, link);
    if (e) return avisar(e);
    if (especial && !motivo.trim()) return avisar("Anota por qué es un caso especial");
    const cambios: Record<string, string> = {
      reunion: fecha,
      reunionModo: modo,
      reunionLugar: esVirtual(modo) ? "" : lugar.trim(),
      reunionLink: esVirtual(modo) ? link.trim() : "",
      ...(especial ? { reunionExtra: motivo.trim() } : {}),
    };
    if (calendar) {
      const url = enlaceCalendar({ ...datos, ...cambios }, perfil);
      if (url) window.open(url, "_blank", "noopener");
    }
    alGuardar(cambios);
  };

  return (
    <div className="gc-panel" aria-label="Agendar reunión">
      <h3 className="sub2">{titulo}</h3>
      {especial && (
        <p className="an-status warn">
          Ya hiciste las dos reuniones con esta persona. Agenda otra solo en un caso extremo o especial, y anota por qué.
        </p>
      )}
      <div className="modos" role="group" aria-label="Modalidad de la reunión">
        {MODOS_REUNION.map((m) => (
          <button key={m.id} type="button" className="chip" aria-pressed={modo === m.id} onClick={() => setModo(m.id)}>
            {m.l}
          </button>
        ))}
      </div>
      <div className="two">
        <div className="f">
          <label htmlFor={id + "f"}>
            <span>Fecha y hora</span>
          </label>
          <input id={id + "f"} type="datetime-local" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        {esVirtual(modo) ? (
          <div className="f">
            <label htmlFor={id + "k"}>
              <span>Link de la reunión</span>
            </label>
            <input
              id={id + "k"}
              type="url"
              inputMode="url"
              value={link}
              placeholder={modo === "zoom" ? "https://zoom.us/j/…" : "https://meet.google.com/…"}
              onChange={(e) => setLink(e.target.value)}
            />
          </div>
        ) : (
          <div className="f">
            <label htmlFor={id + "l"}>
              <span>Lugar</span>
            </label>
            <input id={id + "l"} value={lugar} placeholder="Su oficina, cafetería…" onChange={(e) => setLugar(e.target.value)} />
          </div>
        )}
      </div>
      {especial && (
        <div className="f">
          <label htmlFor={id + "m"}>
            <span>¿Por qué otra reunión? (caso especial)</span>
          </label>
          <input id={id + "m"} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Decide con su pareja, falta un documento…" />
        </div>
      )}
      <label className="ck calendar-ck">
        <input
          type="checkbox"
          checked={calendar}
          onChange={(e) => {
            setCalendar(e.target.checked);
            guardarAuto(e.target.checked);
          }}
        />
        <span>
          Agendar en Google Calendar al guardar
          <small>Se abre con la cita lista (y su correo como invitado): solo toca "Guardar".</small>
        </span>
      </label>
      <button type="button" className="btn small" onClick={guardar}>
        Guardar reunión
      </button>
    </div>
  );
}

/**
 * Recordatorios de la reunión, dos por reunión: el 1 lo envías tú (confirmar,
 * recordar hoy o reprogramar) y el 2 se habilita una hora antes (el Inicio
 * avisa). Con el link si es virtual.
 */
export function Recordatorio({ p, actualizar }: { p: Prospecto; actualizar: (fn: (p: Prospecto) => Prospecto) => void }) {
  const enl = useEnlaces();
  const items = useFichas();
  const hoy = hoyISO();
  const ahora = useAhora();
  const { perfil } = useAjustesPerfil();
  const avisar = useAviso();
  const registrar = useRegistrar(p.id);
  const idTexto = useId();
  const idLink = useId();
  const [elegido, setElegido] = useState<string | null>(null);
  const [editado, setEditado] = useState<Record<string, string>>({});
  const r = reunionDe(p, hoy);
  const modo = modoDe(p);
  const ms = mensajesPara(p, hoy, items, perfil).filter((m) => m.reunion);
  const actual = ms.find((m) => m.id === elegido) ?? ms[0];
  const texto = actual ? (editado[actual.id] ?? actual.texto) : "";
  const wa = numeroWhatsApp(p);
  const sms = actual ? enlaceSMS(p, texto) : null;
  const cal = r && r.dias >= 0 ? enlaceCalendar(p, perfil) : null;
  const est = estadoRecordatorios(p, ahora);
  const texto2 = textoRecordatorio2(p, hoy, perfil);
  const sms2 = texto2 ? enlaceSMS(p, texto2) : null;

  const enviado = (n: 1 | 2, canal: "WhatsApp" | "SMS") => {
    actualizar((x) => ({ ...x, ...marcarRecordatorio(x, n) }));
    registrar(canal, `Recordatorio ${n} de reunión`, canal);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(sinEmojis(texto));
      avisar("Recordatorio copiado");
    } catch {
      avisar("No se pudo copiar");
    }
  };

  return (
    <section className="miss recordatorio" aria-labelledby="t-recordatorio">
      <div className="mh">
        <span className="mnum" aria-hidden="true">
          ⏰
        </span>
        <h2 id="t-recordatorio">Recordatorio de reunión</h2>
        {r && r.dias >= 0 && <span className="mp">{(est.r1 ? 1 : 0) + (est.r2 ? 1 : 0)}/2</span>}
      </div>
      {!r || r.dias < 0 ? (
        <p className="an-note">Agenda la reunión en "+ acciones" para enviar recordatorios.</p>
      ) : (
        <>
          <p className="an-status reunion-aviso">
            Reunión {r.cuando}
            {r.hora && ` a las ${r.hora}`}
            {lugarTexto(p) && ` · ${lugarTexto(p)}`}
          </p>
          {esVirtual(modo) && (
            <div className="f">
              <label htmlFor={idLink}>
                <span>Link de la reunión ({modo === "zoom" ? "Zoom" : "Google Meet"})</span>
              </label>
              <input
                id={idLink}
                type="url"
                inputMode="url"
                value={String(p.reunionLink ?? "")}
                placeholder={modo === "zoom" ? "https://zoom.us/j/…" : "https://meet.google.com/…"}
                onChange={(e) => actualizar((x) => ({ ...x, reunionLink: e.target.value.trim() }))}
              />
              {!linkDe(p) && <p className="an-status warn">Pega el link para que vaya en el recordatorio.</p>}
            </div>
          )}

          <div className={"rec-paso" + (est.r1 ? " hecho" : "")} aria-label="Recordatorio 1">
            <h3 className="sub2">
              Recordatorio 1 · lo envías tú
              {est.r1 && <small> ✓ enviado {fmtFechaHora(est.r1)}</small>}
            </h3>
            <div className="ideas" role="group" aria-label="Elegir recordatorio">
              {ms.map((m) => (
                <button key={m.id} type="button" className="chip" aria-pressed={m.id === actual?.id} onClick={() => setElegido(m.id)}>
                  {m.l}
                </button>
              ))}
            </div>
            {actual && (
              <>
                <div className="f" style={{ marginTop: 10 }}>
                  <label htmlFor={idTexto}>
                    <span>Recordatorio (puedes editarlo)</span>
                  </label>
                  <textarea id={idTexto} rows={5} value={texto} onChange={(e) => setEditado({ ...editado, [actual.id]: e.target.value })} />
                </div>
                <div className="envio">
                  {wa && (
                    <a className="btn wa-btn" {...enl.wa(wa, texto)} rel="noopener noreferrer" onClick={() => enviado(1, "WhatsApp")}>
                      💬 WhatsApp
                    </a>
                  )}
                  {sms && (
                    <a className="btn sms-btn" href={sms} onClick={() => enviado(1, "SMS")}>
                      ✉️ SMS
                    </a>
                  )}
                  <button className="btn ghost" onClick={() => void copiar()}>
                    Copiar
                  </button>
                </div>
              </>
            )}
          </div>

          <div className={"rec-paso" + (est.r2 ? " hecho" : "")} aria-label="Recordatorio 2">
            <h3 className="sub2">
              Recordatorio 2 · 1 hora antes
              {est.r2 && <small> ✓ enviado {fmtFechaHora(est.r2)}</small>}
            </h3>
            {!r.hora ? (
              <p className="an-note">Pon la hora de la reunión para programar el recordatorio 2.</p>
            ) : est.r2 ? null : est.tocaR2 && texto2 ? (
              <>
                <p className="an-status warn">
                  Es momento: la reunión empieza {est.minutos! <= 0 ? "ya" : `en ${est.minutos} min`}.
                </p>
                <p className="paso-txt">{texto2}</p>
                <div className="envio">
                  {wa && (
                    <a className="btn wa-btn" {...enl.wa(wa, texto2)} rel="noopener noreferrer" onClick={() => enviado(2, "WhatsApp")}>
                      💬 Enviar recordatorio 2
                    </a>
                  )}
                  {sms2 && (
                    <a className="btn sms-btn" href={sms2} onClick={() => enviado(2, "SMS")}>
                      ✉️ SMS
                    </a>
                  )}
                </div>
              </>
            ) : est.minutos !== null && est.minutos < 0 ? (
              <p className="an-note">La reunión ya empezó.</p>
            ) : (
              <p className="an-note">
                Se habilita {r.dias === 0 ? "hoy" : r.cuando} a las {horaDe(est.desdeR2!)} (1 hora antes). Te aviso en el Inicio.
              </p>
            )}
          </div>

          {cal && (
            <a className="btn ghost small calendar-btn" href={cal} target="_blank" rel="noopener noreferrer">
              📅 Agregar a Google Calendar
            </a>
          )}
        </>
      )}
    </section>
  );
}

/** "7 oct 10:15" */
function fmtFechaHora(ms: number): string {
  const t = new Date(ms);
  return `${t.toLocaleDateString("es-EC", { day: "numeric", month: "short" })} ${horaDe(ms)}`;
}
